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
        $payload = [
            'user' => [
                'uuid' => $user?->uuid,
                'name' => $user?->name,
                'picture_url' => $user?->picture_url,
                'club' => $user?->club ? ['name' => $user->club->name, 'city' => $user->club->city] : null,
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
            $payload['user']['availabilities'] = $user?->availabilities
                ? $user->availabilities->pluck('day_of_week')->all()
                : [];
        }

        return $payload;
    }
}
