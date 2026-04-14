<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Conversation extends Model
{
    protected $fillable = [
        'uuid',
        'user_a_id',
        'user_b_id',
        'last_message',
        'last_message_at',
    ];

    protected static function booted(): void
    {
        static::creating(function (Conversation $c): void {
            if (empty($c->uuid)) {
                $c->uuid = (string) Str::uuid7();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
        ];
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

    public function messages(): HasMany
    {
        return $this->hasMany(PrivateMessage::class);
    }

    /**
     * Scope : toutes les conversations d'un user donné (peu importe le rôle a/b).
     */
    public function scopeForUser(Builder $q, int $userId): Builder
    {
        return $q->where(function ($sub) use ($userId) {
            $sub->where('user_a_id', $userId)->orWhere('user_b_id', $userId);
        });
    }

    public function hasParticipant(int $userId): bool
    {
        return $this->user_a_id === $userId || $this->user_b_id === $userId;
    }

    public function otherUserId(int $userId): ?int
    {
        if ($this->user_a_id === $userId) return $this->user_b_id;
        if ($this->user_b_id === $userId) return $this->user_a_id;
        return null;
    }
}
