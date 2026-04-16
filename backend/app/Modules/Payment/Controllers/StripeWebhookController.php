<?php

namespace App\Modules\Payment\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Payment\Services\StripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Webhook Stripe — route publique, vérification de signature obligatoire.
 * Retourne 200 même en cas d'erreur pour éviter les retries Stripe à l'infini
 * sur les événements non gérés (log seulement).
 */
class StripeWebhookController extends Controller
{
    public function __invoke(Request $request, StripeService $service): JsonResponse
    {
        $payload = $request->getContent();
        $sig = $request->header('Stripe-Signature', '');

        try {
            $service->handleWebhook($payload, (string) $sig);
        } catch (\UnexpectedValueException $e) {
            Log::warning('Stripe webhook : payload invalide', ['error' => $e->getMessage()]);
            return response()->json(['received' => false], 400);
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            Log::warning('Stripe webhook : signature invalide', ['error' => $e->getMessage()]);
            return response()->json(['received' => false], 400);
        } catch (\Throwable $e) {
            // Événement reçu mais erreur de traitement : 200 pour éviter retry,
            // log pour investigation manuelle.
            Log::error('Stripe webhook : traitement échoué', ['error' => $e->getMessage()]);
            return response()->json(['received' => true, 'error' => 'logged'], 200);
        }

        return response()->json(['received' => true]);
    }
}
