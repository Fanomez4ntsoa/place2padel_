<?php

namespace App\Models;

use Database\Factories\ClubFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
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
        'region',
        'country',
        'latitude',
        'longitude',
        'phone',
        'email',
        'website',
        'courts_count',
        'is_active',
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
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
