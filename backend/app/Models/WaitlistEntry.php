<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WaitlistEntry extends Model
{
    public const FEATURES = ['reservation', 'coaching', 'stage', 'animation', 'rencontre'];

    public const FEATURE_LABELS = [
        'reservation' => 'Réservation de terrains',
        'coaching' => 'Coaching',
        'stage' => 'Stages',
        'animation' => 'Animations',
        'rencontre' => 'Rencontres',
    ];

    protected $fillable = [
        'email',
        'feature',
        'user_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function featureLabel(): string
    {
        return self::FEATURE_LABELS[$this->feature] ?? $this->feature;
    }
}
