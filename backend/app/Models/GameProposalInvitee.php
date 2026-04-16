<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameProposalInvitee extends Model
{
    protected $fillable = [
        'game_proposal_id',
        'user_id',
        'response',
        'responded_at',
    ];

    protected $casts = [
        'responded_at' => 'datetime',
    ];

    public function proposal(): BelongsTo
    {
        return $this->belongsTo(GameProposal::class, 'game_proposal_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
