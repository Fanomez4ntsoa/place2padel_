<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use Illuminate\Http\JsonResponse;

/**
 * Debug/admin — retourne les TeamState bruts (bloc, opponents_played, match_history…).
 * Utile pour valider le moteur de reclassement dynamique visuellement.
 */
class TeamStatesController extends Controller
{
    public function __invoke(Tournament $tournament): JsonResponse
    {
        $states = $tournament->teamStates()
            ->with('team:id,team_name,seed,team_points')
            ->orderBy('bloc')
            ->orderByDesc('wins')
            ->orderBy('losses')
            ->get();

        $data = $states->map(fn ($s) => [
            'team' => [
                'id' => $s->team_id,
                'team_name' => $s->team?->team_name,
                'seed' => $s->team?->seed,
                'team_points' => $s->team?->team_points,
            ],
            'bloc' => $s->bloc,
            'wins' => $s->wins,
            'losses' => $s->losses,
            'waiting_for_match' => $s->waiting_for_match,
            'opponents_played' => $s->opponents_played,
            'match_history' => $s->match_history,
            'eliminated_at_round' => $s->eliminated_at_round,
            'final_position' => $s->final_position,
        ])->all();

        return response()->json(['data' => $data]);
    }
}
