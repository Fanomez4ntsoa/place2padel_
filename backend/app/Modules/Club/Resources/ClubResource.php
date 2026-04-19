<?php

namespace App\Modules\Club\Resources;

use App\Models\Club;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Club */
class ClubResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'name' => $this->name,
            'slug' => $this->slug,
            'address' => $this->address,
            'city' => $this->city,
            'postal_code' => $this->postal_code,
            'department' => $this->department,
            'region' => $this->region,
            'country' => $this->country,
            'latitude' => $this->latitude !== null ? (float) $this->latitude : null,
            'longitude' => $this->longitude !== null ? (float) $this->longitude : null,
            'phone' => $this->phone,
            'email' => $this->email,
            'website' => $this->website,
            'courts_count' => $this->courts_count,
            'indoor' => $this->indoor,
            'picture_url' => $this->picture_url,
            'description' => $this->description,
            'club_type' => $this->club_type,
            'owner' => $this->when(
                $this->relationLoaded('owner') && $this->owner,
                fn () => [
                    'uuid' => $this->owner->uuid,
                    'name' => $this->owner->name,
                ],
            ),
            'owner_id' => $this->owner_id !== null ? (string) $this->owner_id : null,
            'claimed_at' => $this->claimed_at?->toIso8601String(),
            // Compteur d'abonnés — exposé uniquement si loadCount('subscriptions')
            // a été appelé (endpoint /clubs/{uuid} détail, pas sur la recherche).
            'subscribers_count' => $this->when(
                $this->subscriptions_count !== null,
                fn () => (int) $this->subscriptions_count,
            ),
        ];
    }
}
