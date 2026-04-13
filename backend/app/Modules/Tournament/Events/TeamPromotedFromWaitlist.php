<?php

namespace App\Modules\Tournament\Events;

use App\Models\TournamentTeam;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TeamPromotedFromWaitlist
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly TournamentTeam $team) {}
}
