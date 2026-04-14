<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PrivateMessage extends Model
{
    public const TYPE_TEXT = 'text';
    public const TYPE_TOURNAMENT_PROPOSAL = 'tournament_proposal';
    public const TYPE_SYSTEM = 'system';

    protected $fillable = [
        'uuid',
        'conversation_id',
        'sender_id',
        'text',
        'type',
        'data',
    ];

    protected static function booted(): void
    {
        static::creating(function (PrivateMessage $m): void {
            if (empty($m->uuid)) {
                $m->uuid = (string) Str::uuid7();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'data' => 'array',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
