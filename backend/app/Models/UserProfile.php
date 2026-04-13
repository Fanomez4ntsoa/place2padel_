<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserProfile extends Model
{
    protected $fillable = [
        'user_id',
        'bio',
        'position',
        'padel_level',
        'license_number',
        'padel_points',
        'ranking',
        'tenup_synced_at',
        'tenup_name',
        'region',
        'latitude',
        'longitude',
        'max_radius_km',
        'max_radius_training_km',
    ];

    protected function casts(): array
    {
        return [
            'tenup_synced_at' => 'datetime',
            'padel_level' => 'integer',
            'padel_points' => 'integer',
            'ranking' => 'integer',
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
            'max_radius_km' => 'integer',
            'max_radius_training_km' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
