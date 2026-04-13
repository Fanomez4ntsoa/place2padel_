<?php

namespace App\Modules\Tournament\Resources;

use App\Models\TournamentTeam;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin TournamentTeam */
class TournamentTeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'team_name' => $this->team_name,
            'captain' => [
                'uuid' => $this->captain?->uuid,
                'name' => $this->captain_name,
                'points' => $this->captain_points,
            ],
            'partner' => $this->partner_id ? [
                'uuid' => $this->partner?->uuid,
                'name' => $this->partner_name,
                'points' => $this->partner_points,
            ] : null,
            'team_points' => $this->team_points,
            'seed' => $this->seed,
            'status' => $this->status,
            'registered_at' => $this->created_at,
        ];
    }
}
