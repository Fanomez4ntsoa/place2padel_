<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Pool extends Model
{
    protected $fillable = [
        'uuid',
        'tournament_id',
        'pool_name',
        'pool_type',
        'team_ids',
        'standings',
    ];

    protected static function booted(): void
    {
        static::creating(function (Pool $p): void {
            if (empty($p->uuid)) {
                $p->uuid = (string) Str::uuid7();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'team_ids' => 'array',
            'standings' => 'array',
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

    public function matches(): HasMany
    {
        return $this->hasMany(TournamentMatch::class);
    }
}
