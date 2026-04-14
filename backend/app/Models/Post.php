<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Post extends Model
{
    use SoftDeletes;

    public const TYPE_USER = 'user';
    public const TYPE_SYSTEM_NEW_TOURNAMENT = 'system_new_tournament';
    public const TYPE_SYSTEM_RESULT = 'system_result';

    protected $fillable = [
        'uuid',
        'author_id',
        'type',
        'text',
        'image_url',
        'tournament_id',
        'likes_count',
        'comments_count',
    ];

    protected static function booted(): void
    {
        static::creating(function (Post $p): void {
            if (empty($p->uuid)) {
                $p->uuid = (string) Str::uuid7();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'likes_count' => 'integer',
            'comments_count' => 'integer',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function likes(): HasMany
    {
        return $this->hasMany(PostLike::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(PostComment::class);
    }

    public function isSystem(): bool
    {
        return $this->type !== self::TYPE_USER;
    }
}
