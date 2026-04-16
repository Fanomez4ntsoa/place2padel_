<?php

namespace App\Modules\Matchmaking\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Models\User;
use App\Modules\Matchmaking\Services\MatchmakingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Auth optionnelle (décision #3) :
 *   - Viewer anonyme → count + aperçu léger (pas de compat, pas de dispos).
 *   - Viewer authentifié → liste triée par score contextuel + profile/dispos.
 *
 * Route hors groupe auth:sanctum ; on résout manuellement le viewer via la guard.
 */
class ListSeekingPartnersController extends Controller
{
    public function __invoke(Request $request, Tournament $tournament, MatchmakingService $service): JsonResponse
    {
        $viewer = auth('sanctum')->user();
        $viewerIsUser = $viewer instanceof User;

        if (! $viewerIsUser) {
            // Mode public : juste le count + snapshot minimal des derniers inscrits.
            $count = $tournament->interests()->count();
            return response()->json([
                'data' => [],
                'meta' => [
                    'authenticated' => false,
                    'count' => $count,
                    'hint' => 'Connecte-toi pour voir la liste détaillée avec les scores de compatibilité.',
                ],
            ]);
        }

        $candidates = $service->listCompatibleSeekingPartners($tournament, $viewer);

        // Projection inline : la dualité public/auth + injection de score se prête mal
        // à une Resource Eloquent classique (additional() ne survit pas sur single item).
        $data = $candidates->map(function ($row) {
            $interest = $row['interest'];
            $user = $interest->user;
            $primaryClub = $user?->clubs->firstWhere('priority', 1)?->club;
            return [
                'user' => [
                    'uuid' => $user?->uuid,
                    'name' => $user?->name,
                    'picture_url' => $user?->picture_url,
                    'position' => $user?->profile?->position,
                    'padel_points' => $user?->profile?->padel_points,
                    'ranking' => $user?->profile?->ranking,
                    'club' => $primaryClub ? ['name' => $primaryClub->name, 'city' => $primaryClub->city] : null,
                    'availabilities' => $user?->availabilities
                        ? $user->availabilities->map(fn ($av) => [
                            'day_of_week' => $av->day_of_week,
                            'period' => $av->period,
                        ])->values()->all()
                        : [],
                ],
                'message' => $interest->message,
                'compatibility_score' => $row['score'],
                'created_at' => $interest->created_at,
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'authenticated' => true,
                'count' => $candidates->count(),
            ],
        ]);
    }
}
