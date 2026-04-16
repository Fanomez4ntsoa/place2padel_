<?php

namespace App\Modules\Payment\Services;

use App\Models\PaymentTransaction;
use App\Models\Tournament;
use App\Models\User;
use App\Modules\Payment\Support\PriceParser;
use App\Modules\Tournament\Services\TournamentService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Checkout\Session as StripeSession;
use Stripe\StripeClient;
use Stripe\Webhook;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * StripeService — intégration native stripe/stripe-php (pas d'emergentintegrations).
 *
 * Flow :
 * 1. createCheckoutSession : valide l'éligibilité (tournoi online, non-inscrit,
 *    prix parsable), crée une Stripe Checkout Session, enregistre la transaction.
 * 2. getCheckoutStatus : récupère le statut depuis Stripe ; si paid et pas encore
 *    enregistré → auto-inscription via TournamentService + status=paid.
 * 3. handleWebhook : vérifie la signature, met à jour le statut local sur
 *    checkout.session.completed (idempotent).
 */
class StripeService
{
    private ?StripeClient $stripe = null;

    public function __construct(private readonly TournamentService $tournamentService) {}

    /**
     * Lazy init — évite d'instancier StripeClient si le secret est vide
     * (ex: en tests unitaires qui couvrent uniquement la validation).
     */
    private function stripe(): StripeClient
    {
        if ($this->stripe === null) {
            $secret = (string) config('services.stripe.secret');
            if ($secret === '') {
                abort(500, 'Stripe non configuré : STRIPE_SECRET manquant dans .env.');
            }
            $this->stripe = new StripeClient($secret);
        }
        return $this->stripe;
    }

    /**
     * Crée une session Stripe pour un tournoi online. Valide tous les prérequis
     * avant d'appeler Stripe pour éviter les transactions orphelines.
     */
    public function createCheckoutSession(User $user, Tournament $tournament): PaymentTransaction
    {
        if ($tournament->payment_method !== 'online') {
            throw new HttpException(422, 'Ce tournoi n\'accepte pas le paiement en ligne — inscription directe.');
        }

        $cents = PriceParser::toCents($tournament->price);
        if ($cents === null || $cents <= 0) {
            throw new HttpException(422, 'Prix du tournoi invalide ou non défini.');
        }

        // Vérif éligibilité : user pas déjà inscrit, tournoi ouvert.
        if (! in_array($tournament->status, ['open', 'full'], true)) {
            throw new HttpException(422, 'Inscription fermée pour ce tournoi.');
        }
        $alreadyRegistered = $tournament->teams()
            ->where(function ($q) use ($user) {
                $q->where('captain_id', $user->id)->orWhere('partner_id', $user->id);
            })
            ->exists();
        if ($alreadyRegistered) {
            throw new HttpException(422, 'Tu es déjà inscrit à ce tournoi.');
        }

        // Idempotence : si une transaction pending existe déjà pour ce (user, tournament),
        // on retourne son URL Stripe au lieu d'en créer une nouvelle.
        $existing = PaymentTransaction::where('user_id', $user->id)
            ->where('tournament_id', $tournament->id)
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->first();
        if ($existing) {
            return $existing;
        }

        $frontendUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $successUrl = "{$frontendUrl}/tournois/{$tournament->uuid}?session_id={CHECKOUT_SESSION_ID}";
        $cancelUrl = "{$frontendUrl}/tournois/{$tournament->uuid}?payment=cancelled";

        $session = $this->stripe()->checkout->sessions->create([
            'mode' => 'payment',
            'payment_method_types' => ['card'],
            'line_items' => [[
                'quantity' => 1,
                'price_data' => [
                    'currency' => 'eur',
                    'unit_amount' => $cents,
                    'product_data' => [
                        'name' => 'Inscription : '.$tournament->name,
                        'description' => 'Tournoi du '.($tournament->date?->toDateString() ?? ''),
                    ],
                ],
            ]],
            'client_reference_id' => (string) $user->id,
            'metadata' => [
                'tournament_uuid' => $tournament->uuid,
                'user_uuid' => $user->uuid,
            ],
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
        ]);

        return PaymentTransaction::create([
            'user_id' => $user->id,
            'tournament_id' => $tournament->id,
            'session_id' => $session->id,
            'amount_cents' => $cents,
            'currency' => 'EUR',
            'status' => 'pending',
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'metadata' => [
                'checkout_url' => $session->url,
            ],
        ]);
    }

    /**
     * Récupère le statut depuis Stripe ; si paid et pas encore réconcilié,
     * déclenche l'auto-inscription + status=paid. Idempotent : rappelable.
     */
    public function getCheckoutStatus(string $sessionId): PaymentTransaction
    {
        $tx = PaymentTransaction::where('session_id', $sessionId)->firstOrFail();

        // Si déjà paid, pas besoin de re-query Stripe.
        if ($tx->status === 'paid') {
            return $tx;
        }

        $session = $this->stripe()->checkout->sessions->retrieve($sessionId);

        $tx->payment_intent_id = is_string($session->payment_intent) ? $session->payment_intent : null;

        if ($session->payment_status === 'paid') {
            DB::transaction(function () use ($tx) {
                $locked = PaymentTransaction::whereKey($tx->id)->lockForUpdate()->first();
                if ($locked->status === 'paid') {
                    return; // idempotent
                }
                $locked->update([
                    'status' => 'paid',
                    'completed_at' => now(),
                    'payment_intent_id' => $locked->payment_intent_id,
                ]);
                $this->autoRegister($locked);
            });
            return $tx->fresh();
        }

        if (in_array($session->status, ['expired'], true)) {
            $tx->update(['status' => 'expired']);
        }

        $tx->save();
        return $tx;
    }

    /**
     * Webhook handler : checkout.session.completed uniquement pour MVP.
     * Source de vérité secondaire (la polling /status suffit en général).
     *
     * @throws \UnexpectedValueException|\Stripe\Exception\SignatureVerificationException
     */
    public function handleWebhook(string $rawPayload, string $sigHeader): void
    {
        $secret = (string) config('services.stripe.webhook_secret');
        if ($secret === '') {
            Log::warning('Stripe webhook reçu sans secret configuré — ignoré.');
            return;
        }

        $event = Webhook::constructEvent($rawPayload, $sigHeader, $secret);

        if ($event->type === 'checkout.session.completed') {
            /** @var StripeSession $session */
            $session = $event->data->object;
            $this->getCheckoutStatus($session->id); // mutualise la logique d'auto-register.
        }
        // Autres événements ignorés pour MVP (payment_intent.*, refund.*, etc.).
    }

    /**
     * Inscrit l'user au tournoi après paiement confirmé. Idempotent.
     */
    private function autoRegister(PaymentTransaction $tx): void
    {
        $tournament = Tournament::with('teams')->findOrFail($tx->tournament_id);
        $user = User::findOrFail($tx->user_id);

        // Si déjà inscrit entretemps (ex: via webhook + polling simultanés), on skip.
        $alreadyRegistered = $tournament->teams()
            ->where(function ($q) use ($user) {
                $q->where('captain_id', $user->id)->orWhere('partner_id', $user->id);
            })
            ->exists();
        if ($alreadyRegistered) {
            return;
        }

        $this->tournamentService->registerTeam($tournament, $user, null);
    }
}
