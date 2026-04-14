<?php

namespace App\Modules\Notification\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Supprime toutes les souscriptions push de l'user courant (désactive push sur
 * tous ses devices). Passe un `endpoint` optionnel pour ne retirer qu'un device.
 */
class UnsubscribePushController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $endpoint = $request->input('endpoint');

        $query = $request->user()->pushSubscriptions();
        if ($endpoint) {
            $query->where('endpoint', $endpoint);
        }
        $count = $query->delete();

        return response()->json([
            'message' => 'Souscription(s) supprimée(s).',
            'removed' => $count,
        ]);
    }
}
