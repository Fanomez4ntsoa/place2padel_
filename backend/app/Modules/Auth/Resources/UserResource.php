<?php

namespace App\Modules\Auth\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'email' => $this->email,
            'email_verified_at' => $this->email_verified_at,
            'auth_type' => $this->auth_type,
            'role' => $this->role,

            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'name' => $this->name,

            'picture_url' => $this->picture_url,
            'city' => $this->city,

            // Array de clubs triés par priority (1..3). L'ancien `club` singleton
            // est supprimé — clients lisent `clubs[0]` pour le principal.
            'clubs' => $this->whenLoaded('clubs', fn () => $this->clubs->map(fn ($uc) => [
                'uuid' => $uc->club?->uuid,
                'name' => $uc->club?->name,
                'city' => $uc->club?->city,
                'priority' => $uc->priority,
            ])->values()),

            'profile' => $this->whenLoaded('profile', fn () => [
                'bio' => $this->profile->bio,
                'position' => $this->profile->position,
                'padel_level' => $this->profile->padel_level,
                'license_number' => $this->profile->license_number,
                'padel_points' => $this->profile->padel_points,
                'ranking' => $this->profile->ranking,
                'tenup_synced_at' => $this->profile->tenup_synced_at,
                'tenup_name' => $this->profile->tenup_name,
                'region' => $this->profile->region,
                'latitude' => $this->profile->latitude,
                'longitude' => $this->profile->longitude,
                'max_radius_km' => $this->profile->max_radius_km,
                'max_radius_training_km' => $this->profile->max_radius_training_km,
            ]),

            'preferred_levels' => $this->whenLoaded(
                'preferredLevels',
                fn () => $this->preferredLevels->pluck('level')->values()
            ),

            // Availabilities : tuples {day_of_week, period}. day_of_week null = slot Flexible.
            'availabilities' => $this->whenLoaded(
                'availabilities',
                fn () => $this->availabilities->map(fn ($av) => [
                    'day_of_week' => $av->day_of_week,
                    'period' => $av->period,
                ])->values()
            ),

            'created_at' => $this->created_at,
        ];
    }
}
