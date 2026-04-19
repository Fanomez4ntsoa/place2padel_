<?php

namespace App\Modules\Tournament\Resources;

use App\Models\TournamentMatch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin TournamentMatch */
class MatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'phase' => $this->phase,
            'bloc' => $this->bloc,
            'round' => $this->round,
            'match_number' => $this->match_number,
            'pool_uuid' => $this->pool?->uuid,
            'team1' => $this->compactTeam($this->team1),
            'team2' => $this->compactTeam($this->team2),
            'score' => [
                'team1_games' => $this->team1_games,
                'team2_games' => $this->team2_games,
                'tiebreak_team1' => $this->tiebreak_team1,
                'tiebreak_team2' => $this->tiebreak_team2,
            ],
            'status' => $this->status,
            'started_at' => $this->started_at?->toIso8601String(),
            'validated_by_team1' => $this->validated_by_team1,
            'validated_by_team2' => $this->validated_by_team2,
            'winner' => $this->compactTeam($this->winner),
            'court' => $this->court,
            'estimated_time' => $this->estimated_time,
        ];
    }

    private function compactTeam($team): ?array
    {
        if (! $team) {
            return null;
        }
        return [
            'id' => $team->id,
            'team_name' => $team->team_name,
            'seed' => $team->seed,
        ];
    }
}
