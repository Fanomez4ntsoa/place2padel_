<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'uuid',
        'email',
        'email_verified_at',
        'password',
        'auth_type',
        'role',
        'first_name',
        'last_name',
        'name',
        'picture_url',
        'city',
        'club_id',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected static function booted(): void
    {
        static::creating(function (User $user): void {
            if (empty($user->uuid)) {
                $user->uuid = (string) Str::uuid7();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * `picture_url` stocke le PATH S3 brut en DB (ex: "avatars/{uuid}/xyz.jpg").
     * L'accessor renvoie l'URL complète construite par Storage au read.
     * Pour accéder au path brut (ex: delete de l'ancien avatar) :
     *   $user->getRawOriginal('picture_url')
     */
    public function getPictureUrlAttribute(?string $value): ?string
    {
        if (! $value) {
            return null;
        }
        // Pass-through pour les URLs absolues (avatar Google CDN, etc.).
        // Seuls les paths S3 relatifs sont passés à Storage::url().
        if (preg_match('#^https?://#', $value)) {
            return $value;
        }
        return Storage::disk(config('filesystems.avatars', 's3'))->url($value);
    }

    public function club(): BelongsTo
    {
        return $this->belongsTo(Club::class);
    }

    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    public function preferredLevels(): HasMany
    {
        return $this->hasMany(UserPreferredLevel::class);
    }

    public function availabilities(): HasMany
    {
        return $this->hasMany(UserAvailability::class);
    }

    public function subscribedClubs(): BelongsToMany
    {
        return $this->belongsToMany(Club::class, 'club_subscriptions')
            ->withTimestamps();
    }

    public function clubSubscriptions(): HasMany
    {
        return $this->hasMany(ClubSubscription::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class)->latest();
    }

    public function pushSubscriptions(): HasMany
    {
        return $this->hasMany(PushSubscription::class);
    }

    public function tournamentInterests(): HasMany
    {
        return $this->hasMany(TournamentInterest::class);
    }

    public function sentProposals(): HasMany
    {
        return $this->hasMany(Proposal::class, 'from_user_id');
    }

    public function receivedProposals(): HasMany
    {
        return $this->hasMany(Proposal::class, 'to_user_id');
    }

    /**
     * Conversations où l'user est participant (a OU b). Non-relation Eloquent
     * (union logique) — renvoie un Builder trié par dernière activité.
     */
    public function conversations()
    {
        return Conversation::forUser($this->id)
            ->orderByDesc('last_message_at')
            ->orderByDesc('id');
    }
}
