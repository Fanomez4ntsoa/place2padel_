<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Modules\Tournament\Services\MatchEngineService;
use Illuminate\Http\JsonResponse;

class ListPoolsController extends Controller
{
    public function __invoke(Tournament $tournament, MatchEngineService $engine): JsonResponse
    {
        $pools = $tournament->pools()
            ->with('matches:id,pool_id,team1_id,team2_id,team1_games,team2_games,status,winner_team_id')
            ->orderBy('pool_name')
            ->get();

        $data = $pools->map(fn ($pool) => [
            'uuid' => $pool->uuid,
            'pool_name' => $pool->pool_name,
            'pool_type' => $pool->pool_type,
            'team_ids' => $pool->team_ids,
            'standings' => $engine->calculatePoolStandings($pool),
        ])->all();

        return response()->json(['data' => $data]);
    }
}
