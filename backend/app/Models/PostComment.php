<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PostComment extends Model
{
    protected $fillable = [
        'uuid',
        'post_id',
        'user_id',
        'text',
    ];

    protected static function booted(): void
    {
        static::creating(function (PostComment $c): void {
            if (empty($c->uuid)) {
                $c->uuid = (string) Str::uuid7();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
