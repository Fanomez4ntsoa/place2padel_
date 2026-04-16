<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Disponibilité user avec granularité matin/après-midi/soir.
 *
 * Slots Emergent 39b6544 :
 *   day_of_week 1..5 + period 'evening' = Lun..Ven soir
 *   day_of_week 6,7 + period 'morning'|'afternoon' = Sam/Dim matin/après-midi
 *   day_of_week NULL + period 'all' = Flexible (match tout)
 *
 * Le slot 'Flexible' est unique par user (contrainte applicative : combinaison
 * (user_id, day_of_week=NULL, period='all') unique via UNIQUE composite).
 */
class UserAvailability extends Model
{
    public const PERIOD_MORNING = 'morning';
    public const PERIOD_AFTERNOON = 'afternoon';
    public const PERIOD_EVENING = 'evening';
    public const PERIOD_ALL = 'all';

    public const PERIODS = [
        self::PERIOD_MORNING,
        self::PERIOD_AFTERNOON,
        self::PERIOD_EVENING,
        self::PERIOD_ALL,
    ];

    protected $fillable = ['user_id', 'day_of_week', 'period'];

    protected function casts(): array
    {
        return ['day_of_week' => 'integer'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * True si cette row représente le slot "Flexible" (match universel).
     */
    public function isFlexible(): bool
    {
        return $this->day_of_week === null && $this->period === self::PERIOD_ALL;
    }
}
