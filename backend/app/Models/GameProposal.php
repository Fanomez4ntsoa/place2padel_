<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class GameProposal extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'creator_id',
        'date',
        'time',
        'duration_min',
        'club',
        'club_city',
        'status',
        'friendly_match_id',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    protected static function booted(): void
    {
        static::creating(function (GameProposal $p): void {
            if (empty($p->uuid)) {
                $p->uuid = (string) Str::uuid7();
            }
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function invitees(): HasMany
    {
        return $this->hasMany(GameProposalInvitee::class);
    }

    public function friendlyMatch(): BelongsTo
    {
        return $this->belongsTo(FriendlyMatch::class);
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * Nombre de joueurs qui ont accepté — inclut le créateur (auto-accepté).
     */
    public function acceptedCount(): int
    {
        return 1 + $this->invitees()->where('response', 'accepted')->count();
    }
}
