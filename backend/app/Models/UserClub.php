<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pivot enrichi — un user peut déclarer jusqu'à 3 clubs (priority 1..3).
 * Remplace users.club_id (supprimé par la migration create_user_clubs_table).
 */
class UserClub extends Model
{
    protected $fillable = ['user_id', 'club_id', 'priority'];

    protected function casts(): array
    {
        return ['priority' => 'integer'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function club(): BelongsTo
    {
        return $this->belongsTo(Club::class);
    }
}
