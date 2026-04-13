<?php

namespace App\Modules\Club\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Models\ClubSubscription;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UnsubscribeClubController extends Controller
{
    public function __invoke(Request $request, Club $club): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        // Idempotent : 200 même si l'abonnement n'existait pas.
        // On ne check pas is_active ici — un user peut toujours se désabonner
        // d'un club désactivé (nettoyage côté user).
        $deleted = ClubSubscription::where('user_id', $user->id)
            ->where('club_id', $club->id)
            ->delete();

        return response()->json([
            'data' => ['subscribed' => false],
            'message' => $deleted > 0
                ? "Désabonné de {$club->name}."
                : 'Abonnement inexistant.',
        ]);
    }
}
