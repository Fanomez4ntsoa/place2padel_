<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

#[Fillable([
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
])]
class Club extends Model
{
    use SoftDeletes;

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
