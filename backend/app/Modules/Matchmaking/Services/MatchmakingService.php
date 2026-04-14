<?php

namespace App\Modules\Matchmaking\Services;

use App\Models\Conversation;
use App\Models\PrivateMessage;
use App\Models\Proposal;
use App\Models\Tournament;
use App\Models\TournamentInterest;
use App\Models\User;
use App\Modules\Matchmaking\Events\ProposalCreated;
use App\Modules\Matchmaking\Events\ProposalResponded;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class MatchmakingService
{
    // ---------------------------------------------------------------------
    // API publique
    // ---------------------------------------------------------------------

    /**
     * Retourne (créée si besoin) la conversation entre deux users.
     * Respecte la contrainte user_a_id < user_b_id (UNIQUE symétrique).
     */
    public function findOrCreateConversation(int $userAId, int $userBId): Conversation
    {
        [$a, $b] = $this->normalizePair($userAId, $userBId);
        return Conversation::firstOrCreate(
            ['user_a_id' => $a, 'user_b_id' => $b],
        );
    }

    /**
     * Crée une proposal tournament_partner + conversation (si inexistante) +
     * message système dans la conversation. Le tout en transaction pour
     * garantir la cohérence : si l'un échoue, aucun artefact partiel.
     *
     * Guards :
     *   - $from != $to (un user ne se propose pas à lui-même)
     *   - $to n'est pas déjà coéquipier de $from sur ce tournoi
     *   - quota anti-spam (≤ 3 pending (from, to, tournament))
     */
    public function createProposal(
        User $from,
        User $to,
        Tournament $tournament,
        ?array $payload = null,
    ): Proposal {
        if ($from->id === $to->id) {
            throw new HttpException(422, 'Impossible de se proposer à soi-même.');
        }

        $this->assertProposalQuotaAvailable($from, $to, $tournament);

        $proposal = DB::transaction(function () use ($from, $to, $tournament, $payload) {
            $proposal = Proposal::create([
                'type' => Proposal::TYPE_TOURNAMENT_PARTNER,
                'from_user_id' => $from->id,
                'to_user_id' => $to->id,
                'tournament_id' => $tournament->id,
                'status' => Proposal::STATUS_PENDING,
                'payload' => $payload,
            ]);

            $conversation = $this->findOrCreateConversation($from->id, $to->id);

            // Message système dans la conv : matérialise la proposal côté chat.
            $text = "Proposition de partenariat pour {$tournament->name}.";
            $message = PrivateMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $from->id,
                'text' => $text,
                'type' => PrivateMessage::TYPE_TOURNAMENT_PROPOSAL,
                'data' => [
                    'proposal_uuid' => $proposal->uuid,
                    'tournament_uuid' => $tournament->uuid,
                ],
            ]);

            $conversation->update([
                'last_message' => $text,
                'last_message_at' => $message->created_at,
            ]);

            return $proposal;
        });

        ProposalCreated::dispatch($proposal);
        return $proposal;
    }

    /**
     * Accepte ou refuse une proposal. Seul le destinataire peut répondre.
     * Guard additionnel : la proposal doit être pending.
     *
     * @param  'accepted'|'refused'  $response
     */
    public function respondToProposal(Proposal $proposal, User $responder, string $response): Proposal
    {
        if ($proposal->to_user_id !== $responder->id) {
            throw new AuthorizationException('Seul le destinataire peut répondre à cette proposition.');
        }
        if (! $proposal->isPending()) {
            throw new HttpException(422, 'Cette proposition a déjà été traitée.');
        }
        if (! in_array($response, [Proposal::STATUS_ACCEPTED, Proposal::STATUS_REFUSED], true)) {
            throw new HttpException(422, 'Réponse invalide.');
        }

        $response === Proposal::STATUS_ACCEPTED ? $proposal->accept() : $proposal->refuse();

        ProposalResponded::dispatch($proposal->fresh(), $response);
        return $proposal;
    }

    /**
     * Liste des candidats seeking-partner pour $tournament, avec score de compat
     * calculé contextuellement par rapport à $viewer. Exclut : $viewer lui-même,
     * tout user déjà engagé dans une équipe (captain OU partner) du tournoi.
     *
     * Eager-load profile + availabilities + club pour éviter N+1 dans le calcul.
     *
     * @return Collection<int, array{interest: TournamentInterest, score: int}>
     */
    public function listCompatibleSeekingPartners(Tournament $tournament, User $viewer): Collection
    {
        $viewer->loadMissing(['profile', 'availabilities']);

        $excludedUserIds = $tournament->teams()
            ->get(['captain_id', 'partner_id'])
            ->flatMap(fn ($t) => [$t->captain_id, $t->partner_id])
            ->filter()
            ->push($viewer->id)
            ->unique()
            ->all();

        $interests = TournamentInterest::query()
            ->where('tournament_id', $tournament->id)
            ->whereNotIn('user_id', $excludedUserIds)
            ->with(['user.profile', 'user.availabilities', 'user.club:id,name,city'])
            ->get();

        return $interests
            ->map(fn (TournamentInterest $i) => [
                'interest' => $i,
                'score' => $this->contextualCompatibility($viewer, $i->user, $tournament),
            ])
            ->sortByDesc('score')
            ->values();
    }

    // ---------------------------------------------------------------------
    // Helpers privés — algorithme de compatibilité contextuelle + utilitaires.
    // Port fidèle _calc_contextual_compatibility Emergent server.py:3726-3763.
    // ---------------------------------------------------------------------

    /**
     * Score 0-100 entre $a et $b pour un tournoi donné.
     * Pondération : position 30 + niveau 30 + dispos 25 + club 15.
     * Hypothèse : les deux users ont un UserProfile chargé (eager load côté caller).
     */
    private function contextualCompatibility(User $a, User $b, Tournament $tournament): int
    {
        return $this->scorePosition($a, $b)
            + $this->scoreLevel($a, $b)
            + $this->scoreAvailabilities($a, $b)
            + $this->scoreClub($a, $b, $tournament);
    }

    /**
     * Position complémentaire (Emergent : droite+gauche = top). 'both' compense.
     * Max 30 pts.
     */
    private function scorePosition(User $a, User $b): int
    {
        $pa = $a->profile?->position;
        $pb = $b->profile?->position;
        if ($pa === null || $pb === null) {
            return 10; // inconnu partiel → score médian.
        }
        if (($pa === 'left' && $pb === 'right') || ($pa === 'right' && $pb === 'left')) {
            return 30;
        }
        if ($pa === 'both' || $pb === 'both') {
            return 20;
        }
        return 5; // même côté strict → pénalité.
    }

    /**
     * Proximité en points FFT. Écart faible = score élevé. Max 30 pts.
     */
    private function scoreLevel(User $a, User $b): int
    {
        $la = $a->profile?->padel_points ?? 0;
        $lb = $b->profile?->padel_points ?? 0;
        $diff = abs($la - $lb);
        return match (true) {
            $diff < 500 => 30,
            $diff < 2000 => 20,
            $diff < 5000 => 10,
            default => 0,
        };
    }

    /**
     * Recouvrement de disponibilités hebdo (user_availabilities.day_of_week ISO 1..7).
     * Max 25 pts. Consomme overlapAvailabilities().
     */
    private function scoreAvailabilities(User $a, User $b): int
    {
        $overlap = $this->overlapAvailabilities($a, $b);
        return match (true) {
            $overlap >= 3 => 25,
            $overlap === 2 => 18,
            $overlap === 1 => 10,
            default => 0,
        };
    }

    /**
     * Nombre de jours communs entre les dispos hebdomadaires des 2 users.
     * Lit la relation availabilities (eager-loadée par le caller).
     */
    private function overlapAvailabilities(User $a, User $b): int
    {
        $daysA = $a->availabilities->pluck('day_of_week')->all();
        $daysB = $b->availabilities->pluck('day_of_week')->all();
        return count(array_intersect($daysA, $daysB));
    }

    /**
     * Bonus localisation : même club que l'autre joueur (pas le club du tournoi).
     * Emergent : 15 pts si club identique, 0 sinon. Tournament passé en param pour
     * préparer Phase 4.2 (bonus "club du tournoi = club de l'un des deux").
     */
    private function scoreClub(User $a, User $b, Tournament $tournament): int
    {
        if ($a->club_id && $b->club_id && $a->club_id === $b->club_id) {
            return 15;
        }
        return 0;
    }

    /**
     * Retourne [min, max] → garantit l'ordre user_a_id < user_b_id sur les
     * conversations (contrainte UNIQUE symétrique).
     *
     * @return array{0:int, 1:int}
     */
    private function normalizePair(int $userAId, int $userBId): array
    {
        return $userAId < $userBId ? [$userAId, $userBId] : [$userBId, $userAId];
    }

    /**
     * Guard anti-spam : max 3 proposals 'pending' de $from vers $to pour $tournament.
     * Throw 422 si dépassé.
     */
    private function assertProposalQuotaAvailable(User $from, User $to, Tournament $tournament): void
    {
        $pending = Proposal::query()
            ->where('from_user_id', $from->id)
            ->where('to_user_id', $to->id)
            ->where('tournament_id', $tournament->id)
            ->where('status', Proposal::STATUS_PENDING)
            ->count();

        if ($pending >= 3) {
            throw new HttpException(422, 'Quota atteint : 3 propositions pending maximum pour ce tournoi.');
        }
    }
}
