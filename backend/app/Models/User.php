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

    /**
     * Pivot user_clubs (jusqu'à 3 clubs, ordre 1=principal, 2=secondaire, 3=tertiaire).
     * Remplace l'ancien users.club_id (supprimé par migration).
     */
    public function clubs(): HasMany
    {
        return $this->hasMany(UserClub::class)->orderBy('priority');
    }

    /**
     * Accessor back-compat : renvoie la relation Club principale (priority=1).
     * Appelant : $user->primaryClub (charge automatiquement si relationLoaded).
     * Préférer $user->loadMissing('clubs.club') pour éviter N+1.
     */
    public function getPrimaryClubAttribute(): ?Club
    {
        $principal = $this->clubs->firstWhere('priority', 1);
        return $principal?->club;
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

    public function elo(): HasOne
    {
        return $this->hasOne(UserElo::class);
    }

    public function friendlyMatchParticipations(): HasMany
    {
        return $this->hasMany(FriendlyMatchParticipant::class);
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

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class, 'author_id');
    }

    public function postLikes(): HasMany
    {
        return $this->hasMany(PostLike::class);
    }

    public function postComments(): HasMany
    {
        return $this->hasMany(PostComment::class);
    }

    /**
     * Clubs dont cet user est propriétaire (role=club_owner). Relation 1..N via clubs.owner_id.
     * En pratique un user ne revendique qu'un seul club mais la relation reste HasMany
     * pour autoriser le cas admin qui revendique plusieurs clubs.
     */
    public function ownedClubs(): HasMany
    {
        return $this->hasMany(Club::class, 'owner_id');
    }
}
