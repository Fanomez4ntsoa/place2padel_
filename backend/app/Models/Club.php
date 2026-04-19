<?php

namespace App\Models;

use Database\Factories\ClubFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Club extends Model
{
    /** @use HasFactory<ClubFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'slug',
        'address',
        'city',
        'postal_code',
        'department',
        'region',
        'country',
        'latitude',
        'longitude',
        'phone',
        'email',
        'website',
        'courts_count',
        'is_active',
        'owner_id',
        'club_type',
        'description',
        'picture_url',
        'indoor',
        'claimed_at',
    ];

    protected static function booted(): void
    {
        static::creating(function (Club $club): void {
            if (empty($club->uuid)) {
                $club->uuid = (string) Str::uuid7();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
            'courts_count' => 'integer',
            'is_active' => 'boolean',
            'indoor' => 'boolean',
            'claimed_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function subscribers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'club_subscriptions')
            ->withTimestamps();
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(ClubSubscription::class);
    }
}
