<?php

namespace App\Modules\Payment\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Payment\Services\StripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Polling depuis le mobile après redirect Stripe. Idempotent : rappelable,
 * déclenche l'auto-inscription si paid et non encore synchronisé.
 */
class CheckoutStatusController extends Controller
{
    public function __invoke(Request $request, string $sessionId, StripeService $service): JsonResponse
    {
        $tx = $service->getCheckoutStatus($sessionId);

        // Vérif appartenance : un user ne peut consulter que ses propres transactions.
        if ($tx->user_id !== $request->user()->id) {
            abort(403);
        }

        return response()->json([
            'data' => [
                'transaction_uuid' => $tx->uuid,
                'session_id' => $tx->session_id,
                'status' => $tx->status,
                'payment_status' => $tx->status === 'paid' ? 'paid' : 'pending',
                'tournament_uuid' => $tx->tournament?->uuid,
                'completed_at' => $tx->completed_at,
            ],
        ]);
    }
}
