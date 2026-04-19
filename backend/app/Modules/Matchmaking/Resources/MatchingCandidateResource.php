<?php

namespace App\Modules\Matchmaking\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shape d'un candidat retourné par /matching/candidates.
 *
 * Le resource est alimenté par un tableau `['user' => User, 'compatibility' => int,
 * 'geo' => int]` produit par {@see MatchmakingService::listCompatibleCandidates}.
 */
class MatchingCandidateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var array{user: User, compatibility: int, geo: int} $resource */
        $resource = $this->resource;
        $user = $resource['user'];
        // Résolution via guard sanctum : $request->user() retournerait null
        // car le guard par défaut est 'web' (API Sanctum via Bearer).
        $isAuthenticated = auth('sanctum')->check();

        $primaryClub = $user->clubs->firstWhere('priority', 1)?->club;

        $payload = [
            'uuid' => $user->uuid,
            'name' => $user->name,
            'first_name' => $user->first_name,
            'picture_url' => $user->picture_url,
            'city' => $user->city,
            'club' => $primaryClub ? [
                'uuid' => $primaryClub->uuid ?? null,
                'name' => $primaryClub->name,
                'city' => $primaryClub->city,
            ] : null,
            'position' => $user->profile?->position,
            'padel_points' => $user->profile?->padel_points,
            'ranking' => $user->profile?->ranking,
            'bio' => $user->profile?->bio,
            'availabilities' => $user->availabilities
                ? $user->availabilities->map(fn ($av) => [
                    'day_of_week' => $av->day_of_week,
                    'period' => $av->period,
                ])->values()->all()
                : [],
        ];

        if ($isAuthenticated) {
            $payload['compatibility'] = $resource['compatibility'];
            $payload['geo_priority'] = $resource['geo'];
        }

        return $payload;
    }
}
