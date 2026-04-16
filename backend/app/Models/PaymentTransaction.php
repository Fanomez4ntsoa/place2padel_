<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PaymentTransaction extends Model
{
    protected $fillable = [
        'uuid',
        'user_id',
        'tournament_id',
        'session_id',
        'payment_intent_id',
        'amount_cents',
        'currency',
        'status',
        'success_url',
        'cancel_url',
        'completed_at',
        'metadata',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'metadata' => 'array',
        'completed_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (PaymentTransaction $t): void {
            if (empty($t->uuid)) {
                $t->uuid = (string) Str::uuid7();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function amountEuros(): float
    {
        return $this->amount_cents / 100;
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }
}
