<?php

namespace App\Modules\FriendlyMatch\Resources;

use App\Models\FriendlyMatch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin FriendlyMatch */
class FriendlyMatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $this->loadMissing('participants.user', 'creator');

        $team1 = $this->participants->where('team', 1)->sortBy('slot')->values();
        $team2 = $this->participants->where('team', 2)->sortBy('slot')->values();

        return [
            'uuid' => $this->uuid,
            'status' => $this->status,
            'creator' => $this->creator ? [
                'uuid' => $this->creator->uuid,
                'name' => $this->creator->name,
            ] : null,
            'team1' => $this->formatTeam($team1),
            'team2' => $this->formatTeam($team2),
            'score' => [
                'team1_games' => $this->team1_games,
                'team2_games' => $this->team2_games,
                'tiebreak_team1' => $this->tiebreak_team1,
                'tiebreak_team2' => $this->tiebreak_team2,
            ],
            'winner_team' => $this->winner_team,
            'validated_by_team1' => (bool) $this->validated_by_team1,
            'validated_by_team2' => (bool) $this->validated_by_team2,
            'elo_before' => $this->elo_before,
            'location' => $this->location,
            'started_at' => $this->started_at,
            'completed_at' => $this->completed_at,
            'result_photo_url' => $this->result_photo_url,
            'created_at' => $this->created_at,
        ];
    }

    private function formatTeam($participants): array
    {
        return $participants->map(fn ($p) => [
            'user' => $p->user ? [
                'uuid' => $p->user->uuid,
                'name' => $p->user->name,
                'picture_url' => $p->user->picture_url,
            ] : null,
            'slot' => $p->slot,
            'is_captain' => (bool) $p->is_captain,
            'accepted' => $p->accepted_at !== null,
        ])->all();
    }
}
