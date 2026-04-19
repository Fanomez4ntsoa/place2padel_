<?php

namespace App\Modules\Matchmaking\Resources;

use App\Models\PlayerMatch;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shape d'un match mutuel vu depuis le viewer. Alimenté par
 * `['match' => PlayerMatch, 'other' => User, 'conversation_uuid' => ?string]`.
 */
class PlayerMatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var array{match: PlayerMatch, other: ?User, conversation_uuid: ?string} $r */
        $r = $this->resource;
        $match = $r['match'];
        $other = $r['other'];

        $primaryClub = $other?->clubs->firstWhere('priority', 1)?->club;

        return [
            'uuid' => $match->uuid,
            'created_at' => $match->created_at,
            'conversation_uuid' => $r['conversation_uuid'],
            'other' => $other ? [
                'uuid' => $other->uuid,
                'name' => $other->name,
                'first_name' => $other->first_name,
                'picture_url' => $other->picture_url,
                'city' => $other->city,
                'club' => $primaryClub ? [
                    'name' => $primaryClub->name,
                    'city' => $primaryClub->city,
                ] : null,
                'position' => $other->profile?->position,
                'padel_points' => $other->profile?->padel_points,
            ] : null,
        ];
    }
}
