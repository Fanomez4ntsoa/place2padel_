<?php

namespace App\Modules\User\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Profil joueur — projection conditionnelle selon le viewer :
 *   - anonyme       : sportive publique (nom, club, niveau, classement)
 *   - autre user    : + preferred_levels, availabilities
 *   - self / admin  : tout (email, radius, license, tenup_*, etc.)
 *
 * @mixin User
 */
class ProfileResource extends JsonResource
{
    private ?User $viewer;

    public function __construct(User $resource, $viewer = null)
    {
        parent::__construct($resource);
        // Tolère un arg non-User (ex. int key passé par Collection::map) — traité comme anonyme.
        $this->viewer = $viewer instanceof User ? $viewer : null;
    }

    public function toArray(Request $request): array
    {
        $isSelf = $this->viewer && $this->viewer->id === $this->id;
        $isAdmin = $this->viewer && $this->viewer->role === 'admin';
        $isAuthed = $this->viewer !== null;

        $public = [
            'uuid' => $this->uuid,
            'name' => $this->name,
            'picture_url' => $this->picture_url,
            'clubs' => $this->whenLoaded('clubs', fn () => $this->clubs->map(fn ($uc) => [
                'uuid' => $uc->club?->uuid,
                'name' => $uc->club?->name,
                'city' => $uc->club?->city,
                'priority' => $uc->priority,
            ])->values()),
            'region' => $this->profile?->region,
            'padel_level' => $this->profile?->padel_level,
            'ranking' => $this->profile?->ranking,
            'padel_points' => $this->profile?->padel_points,
        ];

        if (! $isAuthed) {
            return $public;
        }

        $authed = array_merge($public, [
            'preferred_levels' => $this->whenLoaded(
                'preferredLevels',
                fn () => $this->preferredLevels->pluck('level')->values(),
            ),
            'availabilities' => $this->whenLoaded(
                'availabilities',
                fn () => $this->availabilities->map(fn ($av) => [
                    'day_of_week' => $av->day_of_week,
                    'period' => $av->period,
                ])->values(),
            ),
        ]);

        if (! $isSelf && ! $isAdmin) {
            return $authed;
        }

        return array_merge($authed, [
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'email_verified_at' => $this->email_verified_at,
            'auth_type' => $this->auth_type,
            'role' => $this->role,
            'city' => $this->city,
            'profile' => $this->profile ? [
                'bio' => $this->profile->bio,
                'position' => $this->profile->position,
                'license_number' => $this->profile->license_number,
                'tenup_name' => $this->profile->tenup_name,
                'tenup_synced_at' => $this->profile->tenup_synced_at,
                'latitude' => $this->profile->latitude,
                'longitude' => $this->profile->longitude,
                'max_radius_km' => $this->profile->max_radius_km,
                'max_radius_training_km' => $this->profile->max_radius_training_km,
            ] : null,
            'created_at' => $this->created_at,
        ]);
    }
}
