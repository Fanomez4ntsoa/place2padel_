<?php

namespace App\Modules\Club\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Models\ClubSubscription;
use App\Models\User;
use App\Modules\Club\Resources\ClubResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscribeClubController extends Controller
{
    public function __invoke(Request $request, Club $club): JsonResponse
    {
        if (! $club->is_active) {
            abort(404);
        }

        /** @var User $user */
        $user = $request->user();

        // Idempotent : si déjà abonné, on renvoie le record existant (pas d'erreur).
        $sub = ClubSubscription::firstOrCreate([
            'user_id' => $user->id,
            'club_id' => $club->id,
        ]);

        return response()->json([
            'data' => [
                'subscribed' => true,
                'club' => new ClubResource($club),
                'since' => $sub->created_at,
            ],
            'message' => $sub->wasRecentlyCreated
                ? "Abonné aux alertes de {$club->name}."
                : "Déjà abonné à {$club->name}.",
        ], $sub->wasRecentlyCreated ? 201 : 200);
    }
}
