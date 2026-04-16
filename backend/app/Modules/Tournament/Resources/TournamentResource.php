<?php

namespace App\Modules\Tournament\Resources;

use App\Models\Tournament;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Tournament */
class TournamentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'name' => $this->name,
            'location' => $this->location,
            'type' => $this->type,
            'level' => $this->level,
            'date' => $this->date?->toDateString(),
            'start_time' => $this->start_time ? substr((string) $this->start_time, 0, 5) : null,
            'inscription_deadline' => $this->inscription_deadline?->toDateString(),
            'max_teams' => $this->max_teams,
            'courts_available' => $this->courts_available,
            'price' => $this->price,
            'payment_method' => $this->payment_method,
            'share_link' => $this->share_link,
            'status' => $this->status,
            'launched_at' => $this->launched_at,
            'created_at' => $this->created_at,

            'club' => $this->whenLoaded('club', fn () => [
                'uuid' => $this->club->uuid,
                'name' => $this->club->name,
                'city' => $this->club->city,
            ]),

            'creator' => $this->whenLoaded('creator', fn () => [
                'uuid' => $this->creator->uuid,
                'name' => $this->creator->name,
            ]),

            // Expose uniquement si precalculé via withCount OU relation eager-loaded.
            'teams_count' => $this->when(
                $this->registered_teams_count !== null
                    || $this->relationLoaded('registeredTeams'),
                fn () => (int) ($this->registered_teams_count
                    ?? $this->registeredTeams->count()),
            ),

            'waitlist_count' => $this->when(
                $this->waitlisted_teams_count !== null
                    || $this->relationLoaded('waitlistedTeams'),
                fn () => (int) ($this->waitlisted_teams_count
                    ?? $this->waitlistedTeams->count()),
            ),

            // Exposé uniquement sur le détail (relation explicitement eager-loaded).
            // Jamais en liste — withCount suffit pour les counts.
            'teams' => $this->whenLoaded(
                'registeredTeams',
                fn () => TournamentTeamResource::collection($this->registeredTeams),
            ),
            'waitlist' => $this->whenLoaded(
                'waitlistedTeams',
                fn () => TournamentTeamResource::collection($this->waitlistedTeams),
            ),
        ];
    }
}
