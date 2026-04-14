<?php

namespace App\Modules\Matchmaking\Events;

use App\Models\Proposal;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProposalCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Proposal $proposal) {}
}
