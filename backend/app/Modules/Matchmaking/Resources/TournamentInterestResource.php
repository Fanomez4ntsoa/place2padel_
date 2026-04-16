<?php

namespace App\Modules\Matchmaking\Resources;

use App\Models\TournamentInterest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TournamentInterest
 * Score injecté via additional['score'] dans le controller (null en mode public).
 * Détails dispos/profile conditionnels : seulement pour viewer authentifié.
 */
class TournamentInterestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // compatibility_score est un attribut virtuel posé par ListSeekingPartnersController.
        $score = $this->resource->compatibility_score ?? null;
        $isAuthenticated = $request->user() !== null;

        $user = $this->user;
        $primaryClub = $user?->clubs->firstWhere('priority', 1)?->club;
        $payload = [
            'user' => [
                'uuid' => $user?->uuid,
                'name' => $user?->name,
                'picture_url' => $user?->picture_url,
                'club' => $primaryClub ? ['name' => $primaryClub->name, 'city' => $primaryClub->city] : null,
            ],
            'created_at' => $this->created_at,
        ];

        if ($isAuthenticated) {
            // Viewer connecté : score + détails utiles à la décision.
            $payload['message'] = $this->message;
            $payload['compatibility_score'] = $score;
            $payload['user']['position'] = $user?->profile?->position;
            $payload['user']['padel_points'] = $user?->profile?->padel_points;
            $payload['user']['ranking'] = $user?->profile?->ranking;
            // Tuples {day_of_week, period} — day_of_week null = Flexible.
            $payload['user']['availabilities'] = $user?->availabilities
                ? $user->availabilities->map(fn ($av) => [
                    'day_of_week' => $av->day_of_week,
                    'period' => $av->period,
                ])->values()->all()
                : [];
        }

        return $payload;
    }
}
