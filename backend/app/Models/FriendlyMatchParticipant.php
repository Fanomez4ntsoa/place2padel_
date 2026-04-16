<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FriendlyMatchParticipant extends Model
{
    protected $fillable = [
        'friendly_match_id',
        'user_id',
        'team',
        'slot',
        'is_captain',
        'accepted_at',
    ];

    protected $casts = [
        'is_captain' => 'boolean',
        'accepted_at' => 'datetime',
    ];

    public function friendlyMatch(): BelongsTo
    {
        return $this->belongsTo(FriendlyMatch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
