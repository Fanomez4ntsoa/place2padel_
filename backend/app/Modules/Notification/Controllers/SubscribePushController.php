<?php

namespace App\Modules\Notification\Controllers;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Modules\Notification\Requests\SubscribePushRequest;
use Illuminate\Http\JsonResponse;

/**
 * Upsert la souscription push. La même endpoint peut changer de user (device partagé)
 * — on s'aligne donc sur endpoint (UNIQUE en DB) et on met à jour user_id + keys.
 * L'envoi réel arrive en Phase 4 ; ici on persiste uniquement.
 */
class SubscribePushController extends Controller
{
    public function __invoke(SubscribePushRequest $request): JsonResponse
    {
        PushSubscription::updateOrCreate(
            ['endpoint' => $request->input('endpoint')],
            [
                'user_id' => $request->user()->id,
                'p256dh' => $request->input('keys.p256dh'),
                'auth' => $request->input('keys.auth'),
            ],
        );

        return response()->json(['message' => 'Souscription push enregistrée.']);
    }
}
