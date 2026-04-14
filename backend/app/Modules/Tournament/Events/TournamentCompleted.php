<?php

namespace App\Modules\Tournament\Events;

use App\Models\Tournament;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TournamentCompleted
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Tournament $tournament) {}
}
