<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Swipe extends Model
{
    public const ACTION_LIKE = 'like';
    public const ACTION_PASS = 'pass';

    public const ACTIONS = [self::ACTION_LIKE, self::ACTION_PASS];

    protected $fillable = [
        'from_user_id',
        'to_user_id',
        'action',
    ];

    public function from(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    public function to(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }
}
