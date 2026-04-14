<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\TeamState;
use App\Models\Tournament;
use Illuminate\Http\JsonResponse;

class RankingController extends Controller
{
    public function __invoke(Tournament $tournament): JsonResponse
    {
        // Classement dynamique. Si le tournoi est complété, on respecte final_position (source de vérité figée par finalizeIfExhausted).
        // Sinon tri provisoire (wins DESC, losses ASC, team_points DESC) — miroir du tri Emergent.
        $states = TeamState::query()
            ->where('team_states.tournament_id', $tournament->id)
            ->join('tournament_teams', 'team_states.team_id', '=', 'tournament_teams.id')
            ->select([
                'team_states.*',
                'tournament_teams.team_name',
                'tournament_teams.seed',
                'tournament_teams.team_points',
            ])
            ->get();

        $isCompleted = $tournament->status === 'completed';

        if ($isCompleted) {
            $sorted = $states->sortBy([
                // null en dernier (ne devrait pas arriver si finalize a tourné, garde-fou).
                fn ($a, $b) => ($a->final_position ?? PHP_INT_MAX) <=> ($b->final_position ?? PHP_INT_MAX),
            ]);
        } else {
            $sorted = $states->sort(fn ($a, $b) => [
                -$a->wins, $a->losses, -$a->team_points,
            ] <=> [
                -$b->wins, $b->losses, -$b->team_points,
            ]);
        }

        $position = 1;
        $data = $sorted->values()->map(function ($s) use ($isCompleted, &$position) {
            return [
                'position' => $isCompleted ? $s->final_position : $position++,
            'team' => [
                'id' => $s->team_id,
                'team_name' => $s->team_name,
                'seed' => $s->seed,
                'team_points' => $s->team_points,
            ],
            'wins' => $s->wins,
            'losses' => $s->losses,
            'bloc' => $s->bloc,
            'final_position' => $s->final_position,
            'eliminated_at_round' => $s->eliminated_at_round,
            ];
        })->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'status' => $tournament->status,
                'final' => $isCompleted,
            ],
        ]);
    }
}
