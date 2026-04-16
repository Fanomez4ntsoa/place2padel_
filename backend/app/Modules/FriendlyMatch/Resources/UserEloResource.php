<?php

namespace App\Modules\FriendlyMatch\Resources;

use App\Models\UserElo;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin UserElo */
class UserEloResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'declared_level' => $this->declared_level,
            'elo_level' => (float) $this->elo_level,
            'display_value' => $this->displayValue(),
            'matches_played' => $this->matches_played,
            'matches_won' => $this->matches_won,
            'matches_lost' => $this->matches_lost,
            'is_locked' => (bool) $this->is_locked,
            'matches_to_unlock' => max(0, 10 - $this->matches_played),
            'history' => $this->history ?? [],
            'last_updated_at' => $this->last_updated_at,
        ];
    }
}
