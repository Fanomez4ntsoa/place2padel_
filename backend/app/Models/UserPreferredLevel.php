<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPreferredLevel extends Model
{
    protected $fillable = ['user_id', 'level'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
