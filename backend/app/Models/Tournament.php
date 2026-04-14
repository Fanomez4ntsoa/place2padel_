<?php

namespace App\Models;

use Database\Factories\TournamentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Tournament extends Model
{
    /** @use HasFactory<TournamentFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'club_id',
        'created_by_user_id',
        'name',
        'location',
        'type',
        'level',
        'date',
        'start_time',
        'inscription_deadline',
        'max_teams',
        'courts_available',
        'price',
        'share_link',
        'status',
        'launched_at',
    ];

    protected static function booted(): void
    {
        static::creating(function (Tournament $t): void {
            if (empty($t->uuid)) {
                $t->uuid = (string) Str::uuid7();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'inscription_deadline' => 'date',
            'launched_at' => 'datetime',
            'max_teams' => 'integer',
            'courts_available' => 'integer',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function club(): BelongsTo
    {
        return $this->belongsTo(Club::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function teams(): HasMany
    {
        return $this->hasMany(TournamentTeam::class);
    }

    public function registeredTeams(): HasMany
    {
        return $this->teams()->where('status', 'registered');
    }

    public function waitlistedTeams(): HasMany
    {
        return $this->teams()->where('status', 'waitlisted')->orderBy('created_at');
    }

    public function isFull(): bool
    {
        return $this->registeredTeams()->count() >= $this->max_teams;
    }

    public function matches(): HasMany
    {
        return $this->hasMany(TournamentMatch::class);
    }

    public function pools(): HasMany
    {
        return $this->hasMany(Pool::class);
    }

    public function teamStates(): HasMany
    {
        return $this->hasMany(TeamState::class);
    }

    public function interests(): HasMany
    {
        return $this->hasMany(TournamentInterest::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }
}
