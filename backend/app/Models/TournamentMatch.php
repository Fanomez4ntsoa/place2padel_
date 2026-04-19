<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

// Nommé TournamentMatch car `Match` est un mot-clé réservé PHP 8+ (expression match).
class TournamentMatch extends Model
{
    protected $table = 'matches';

    protected $fillable = [
        'uuid',
        'tournament_id',
        'pool_id',
        'phase',
        'bloc',
        'round',
        'match_number',
        'team1_id',
        'team2_id',
        'team1_games',
        'team2_games',
        'tiebreak_team1',
        'tiebreak_team2',
        'status',
        'started_at',
        'validated_by_team1',
        'validated_by_team2',
        'winner_team_id',
        'court',
        'estimated_time',
    ];

    protected static function booted(): void
    {
        static::creating(function (TournamentMatch $m): void {
            if (empty($m->uuid)) {
                $m->uuid = (string) Str::uuid7();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'round' => 'integer',
            'match_number' => 'integer',
            'team1_games' => 'integer',
            'team2_games' => 'integer',
            'tiebreak_team1' => 'integer',
            'tiebreak_team2' => 'integer',
            'validated_by_team1' => 'boolean',
            'validated_by_team2' => 'boolean',
            'court' => 'integer',
            'estimated_time' => 'datetime',
            'started_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function pool(): BelongsTo
    {
        return $this->belongsTo(Pool::class);
    }

    public function team1(): BelongsTo
    {
        return $this->belongsTo(TournamentTeam::class, 'team1_id');
    }

    public function team2(): BelongsTo
    {
        return $this->belongsTo(TournamentTeam::class, 'team2_id');
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(TournamentTeam::class, 'winner_team_id');
    }

    public function isBye(): bool
    {
        return $this->team2_id === null;
    }

    public function isFullyValidated(): bool
    {
        return $this->validated_by_team1 && $this->validated_by_team2;
    }
}
