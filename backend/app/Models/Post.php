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

    // Coarse categories — filtrées par FeedService. Valeurs libres (VARCHAR).
    public const TYPE_USER = 'user';
    public const TYPE_SYSTEM_NEW_TOURNAMENT = 'system_new_tournament';
    public const TYPE_SYSTEM_RESULT = 'system_result';
    public const TYPE_SYSTEM_WELCOME = 'system_welcome';
    public const TYPE_SYSTEM_RESULT_FRIENDLY = 'system_result_friendly';
    public const TYPE_SYSTEM_TOURNAMENT_CLUB = 'system_tournament_club';

    // Fine classification Emergent — discriminant pour l'affichage UI.
    public const POST_TYPE_NEW_PLAYER = 'new_player';
    public const POST_TYPE_NEW_COMPETITOR = 'new_competitor';
    public const POST_TYPE_MATCH_RESULT = 'match_result';
    public const POST_TYPE_TOURNAMENT_CLUB = 'tournament_club';
    public const POST_TYPE_REFEREE_ANNOUNCEMENT = 'referee_announcement';

    // Hint ratio image côté front.
    public const ASPECT_SQUARE = 'square';
    public const ASPECT_PORTRAIT = 'portrait';
    public const ASPECT_LANDSCAPE = 'landscape';

    protected $fillable = [
        'uuid',
        'author_id',
        'type',
        'post_type',
        'text',
        'image_url',
        'metadata',
        'post_aspect',
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
            'metadata' => 'array',
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
