<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Notification extends Model
{
    protected $fillable = [
        'uuid',
        'user_id',
        'type',
        'title',
        'message',
        'link',
        'data',
        'read_at',
    ];

    protected static function booted(): void
    {
        static::creating(function (Notification $n): void {
            if (empty($n->uuid)) {
                $n->uuid = (string) Str::uuid7();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'read_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isRead(): bool
    {
        return $this->read_at !== null;
    }

    public function markAsRead(): void
    {
        if ($this->read_at === null) {
            $this->read_at = now();
            $this->save();
        }
    }
}
