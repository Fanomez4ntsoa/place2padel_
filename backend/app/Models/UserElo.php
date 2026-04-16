<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserElo extends Model
{
    protected $fillable = [
        'user_id',
        'declared_level',
        'elo_level',
        'matches_played',
        'matches_won',
        'matches_lost',
        'is_locked',
        'history',
        'last_updated_at',
    ];

    protected $casts = [
        'elo_level' => 'float',
        'is_locked' => 'boolean',
        'history' => 'array',
        'last_updated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Valeur affichée : declared_level si locked (entier), sinon elo_level (float 2 déc).
     * Contrat Emergent (_get_elo dans server.py).
     */
    public function displayValue(): float
    {
        return $this->is_locked
            ? (float) $this->declared_level
            : (float) $this->elo_level;
    }
}
