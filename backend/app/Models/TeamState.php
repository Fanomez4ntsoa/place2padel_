<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeamState extends Model
{
    protected $fillable = [
        'tournament_id',
        'team_id',
        'wins',
        'losses',
        'bloc',
        'waiting_for_match',
        'opponents_played',
        'match_history',
        'eliminated_at_round',
        'final_position',
    ];

    protected $attributes = [
        'opponents_played' => '[]',
        'match_history' => '[]',
    ];

    protected function casts(): array
    {
        return [
            'wins' => 'integer',
            'losses' => 'integer',
            'waiting_for_match' => 'boolean',
            'opponents_played' => 'array',
            'match_history' => 'array',
            'eliminated_at_round' => 'integer',
            'final_position' => 'integer',
        ];
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(TournamentTeam::class, 'team_id');
    }
}
