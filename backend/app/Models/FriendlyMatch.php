<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class FriendlyMatch extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'creator_id',
        'club_id',
        'status',
        'team1_games',
        'team2_games',
        'tiebreak_team1',
        'tiebreak_team2',
        'winner_team',
        'validated_by_team1',
        'validated_by_team2',
        'elo_before',
        'location',
        'scheduled_at',
        'started_at',
        'completed_at',
        'result_photo_url',
    ];

    protected $casts = [
        'elo_before' => 'array',
        'validated_by_team1' => 'boolean',
        'validated_by_team2' => 'boolean',
        'scheduled_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (FriendlyMatch $m): void {
            if (empty($m->uuid)) {
                $m->uuid = (string) Str::uuid7();
            }
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function club(): BelongsTo
    {
        return $this->belongsTo(Club::class);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(FriendlyMatchParticipant::class);
    }

    public function team1Participants(): HasMany
    {
        return $this->hasMany(FriendlyMatchParticipant::class)->where('team', 1);
    }

    public function team2Participants(): HasMany
    {
        return $this->hasMany(FriendlyMatchParticipant::class)->where('team', 2);
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function hasParticipant(int $userId): bool
    {
        return $this->participants()->where('user_id', $userId)->exists();
    }

    public function isCaptain(int $userId, int $team): bool
    {
        return $this->participants()
            ->where('user_id', $userId)
            ->where('team', $team)
            ->where('is_captain', true)
            ->exists();
    }
}
