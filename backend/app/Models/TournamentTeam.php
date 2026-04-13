<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TournamentTeam extends Model
{
    protected $fillable = [
        'tournament_id',
        'captain_id',
        'partner_id',
        'captain_name',
        'partner_name',
        'captain_points',
        'partner_points',
        'team_points',
        'team_name',
        'seed',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'captain_points' => 'integer',
            'partner_points' => 'integer',
            'team_points' => 'integer',
            'seed' => 'integer',
        ];
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function captain(): BelongsTo
    {
        return $this->belongsTo(User::class, 'captain_id');
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'partner_id');
    }

    public function isRegistered(): bool
    {
        return $this->status === 'registered';
    }

    public function isWaitlisted(): bool
    {
        return $this->status === 'waitlisted';
    }
}
