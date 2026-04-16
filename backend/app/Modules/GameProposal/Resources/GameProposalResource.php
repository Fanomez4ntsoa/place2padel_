<?php

namespace App\Modules\GameProposal\Resources;

use App\Models\GameProposal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin GameProposal */
class GameProposalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $this->loadMissing('invitees.user', 'creator', 'friendlyMatch');

        $acceptedCount = 1 + $this->invitees->where('response', 'accepted')->count();

        return [
            'uuid' => $this->uuid,
            'status' => $this->status,
            'creator' => $this->creator ? [
                'uuid' => $this->creator->uuid,
                'name' => $this->creator->name,
                'picture_url' => $this->creator->picture_url,
            ] : null,
            'schedule' => [
                'date' => $this->date?->toDateString(),
                'time' => $this->time,
                'duration_min' => $this->duration_min,
            ],
            'location' => [
                'club' => $this->club,
                'city' => $this->club_city,
            ],
            'invitees' => $this->invitees->map(fn ($i) => [
                'user' => $i->user ? [
                    'uuid' => $i->user->uuid,
                    'name' => $i->user->name,
                    'picture_url' => $i->user->picture_url,
                ] : null,
                'response' => $i->response,
                'responded_at' => $i->responded_at,
            ])->values(),
            'accepted_count' => $acceptedCount,
            'players_needed' => 4,
            'friendly_match' => $this->friendlyMatch ? [
                'uuid' => $this->friendlyMatch->uuid,
            ] : null,
            'created_at' => $this->created_at,
        ];
    }
}
