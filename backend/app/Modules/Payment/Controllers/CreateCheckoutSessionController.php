<?php

namespace App\Modules\Payment\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Modules\Payment\Services\StripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CreateCheckoutSessionController extends Controller
{
    public function __invoke(Request $request, StripeService $service): JsonResponse
    {
        $data = $request->validate([
            'tournament_uuid' => ['required', 'uuid', 'exists:tournaments,uuid'],
        ]);

        $tournament = Tournament::where('uuid', $data['tournament_uuid'])->firstOrFail();
        $tx = $service->createCheckoutSession($request->user(), $tournament);

        return response()->json([
            'data' => [
                'transaction_uuid' => $tx->uuid,
                'session_id' => $tx->session_id,
                'checkout_url' => $tx->metadata['checkout_url'] ?? null,
                'amount_cents' => $tx->amount_cents,
                'currency' => $tx->currency,
                'status' => $tx->status,
            ],
        ], 201);
    }
}
