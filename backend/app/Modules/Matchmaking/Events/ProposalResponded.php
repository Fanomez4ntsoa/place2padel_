<?php

namespace App\Modules\Matchmaking\Events;

use App\Models\Proposal;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProposalResponded
{
    use Dispatchable, SerializesModels;

    /** @param  'accepted'|'refused'  $response */
    public function __construct(
        public readonly Proposal $proposal,
        public readonly string $response,
    ) {}
}
