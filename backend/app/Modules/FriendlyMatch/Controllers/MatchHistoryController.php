<?php

namespace App\Modules\FriendlyMatch\Controllers;

use App\Http\Controllers\Controller;
use App\Models\FriendlyMatch;
use App\Models\User;
use Illuminate\Http\JsonResponse;

/**
 * Historique consolidé des matchs d'un user (amical). MVP : retourne uniquement
 * les friendly_matches auxquels l'user a participé, triés DESC par completed_at.
 * La fusion avec les tournament_matches est reportée (nécessite un dataloader
 * unifié — complexité hors scope G7).
 */
class MatchHistoryController extends Controller
{
    public function __invoke(User $user): JsonResponse
    {
        $matches = FriendlyMatch::query()
            ->with(['participants.user'])
            ->whereHas('participants', fn ($q) => $q->where('user_id', $user->id))
            ->where('status', 'completed')
            ->orderByDesc('completed_at')
            ->get();

        $data = $matches->map(function (FriendlyMatch $m) use ($user) {
            $myTeam = $m->participants->firstWhere('user_id', $user->id)?->team;
            $didWin = $myTeam && $m->winner_team === $myTeam;

            return [
                'match_uuid' => $m->uuid,
                'type' => 'friendly',
                'date' => $m->completed_at,
                'result' => $didWin ? 'win' : 'loss',
                'score' => [
                    'team1_games' => $m->team1_games,
                    'team2_games' => $m->team2_games,
                ],
                'winner_team' => $m->winner_team,
                'my_team' => $myTeam,
            ];
        });

        return response()->json(['data' => $data]);
    }
}
