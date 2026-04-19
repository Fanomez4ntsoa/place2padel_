<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PlayerMatch extends Model
{
    protected $fillable = [
        'uuid',
        'user_a_id',
        'user_b_id',
    ];

    protected static function booted(): void
    {
        static::creating(function (PlayerMatch $match): void {
            if (empty($match->uuid)) {
                $match->uuid = (string) Str::uuid7();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function userA(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_a_id');
    }

    public function userB(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_b_id');
    }

    /**
     * Renvoie l'autre participant par rapport à un user donné.
     * Assume que $user est bien l'un des deux du match.
     */
    public function other(User $user): ?User
    {
        if ($user->id === $this->user_a_id) {
            return $this->userB;
        }
        if ($user->id === $this->user_b_id) {
            return $this->userA;
        }
        return null;
    }
}
