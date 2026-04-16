<?php

namespace App\Modules\FriendlyMatch\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserElo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * 2 leaderboards ELO — friends (placeholder : tous les users unlocked) et club
 * (scoped par club_id). MVP : le cercle "friends" est approximé par "tous les
 * users avec ELO unlocked" tant qu'une table friends/follows n'existe pas.
 */
class LeaderboardController extends Controller
{
    public function friends(): JsonResponse
    {
        $entries = UserElo::query()
            ->with('user:id,uuid,name,picture_url,club_id')
            ->where('is_locked', false)
            ->orderByDesc('elo_level')
            ->limit(50)
            ->get();

        return response()->json(['data' => $this->format($entries)]);
    }

    public function club(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $clubId = $user->club_id;

        if (! $clubId) {
            return response()->json(['data' => [], 'meta' => ['hint' => 'Sélectionne un club pour voir le classement.']]);
        }

        $entries = UserElo::query()
            ->join('users', 'users.id', '=', 'user_elos.user_id')
            ->where('users.club_id', $clubId)
            ->where('user_elos.is_locked', false)
            ->orderByDesc('user_elos.elo_level')
            ->select(['user_elos.*'])
            ->with('user:id,uuid,name,picture_url,club_id')
            ->limit(100)
            ->get();

        return response()->json(['data' => $this->format($entries)]);
    }

    private function format($entries): array
    {
        return $entries->values()->map(fn (UserElo $e, int $i) => [
            'rank' => $i + 1,
            'user' => $e->user ? [
                'uuid' => $e->user->uuid,
                'name' => $e->user->name,
                'picture_url' => $e->user->picture_url,
            ] : null,
            'elo_level' => (float) $e->elo_level,
            'matches_played' => $e->matches_played,
            'matches_won' => $e->matches_won,
            'matches_lost' => $e->matches_lost,
        ])->all();
    }
}
