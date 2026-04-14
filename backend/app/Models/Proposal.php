<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Proposal extends Model
{
    use SoftDeletes;

    public const STATUS_PENDING = 'pending';
    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_REFUSED = 'refused';

    public const TYPE_TOURNAMENT_PARTNER = 'tournament_partner';

    protected $fillable = [
        'uuid',
        'type',
        'from_user_id',
        'to_user_id',
        'tournament_id',
        'status',
        'payload',
    ];

    protected static function booted(): void
    {
        static::creating(function (Proposal $p): void {
            if (empty($p->uuid)) {
                $p->uuid = (string) Str::uuid7();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function fromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    public function toUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function accept(): void
    {
        $this->status = self::STATUS_ACCEPTED;
        $this->save();
    }

    public function refuse(): void
    {
        $this->status = self::STATUS_REFUSED;
        $this->save();
    }
}
