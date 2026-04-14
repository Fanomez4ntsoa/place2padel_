<?php

namespace App\Modules\Matchmaking\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Proposal;
use App\Modules\Matchmaking\Requests\RespondProposalRequest;
use App\Modules\Matchmaking\Resources\ProposalResource;
use App\Modules\Matchmaking\Services\MatchmakingService;

class RespondProposalController extends Controller
{
    public function __invoke(
        RespondProposalRequest $request,
        Proposal $proposal,
        MatchmakingService $service,
    ): ProposalResource {
        $updated = $service->respondToProposal(
            proposal: $proposal,
            responder: $request->user(),
            response: $request->input('response'),
        );

        return new ProposalResource($updated->load(['fromUser', 'toUser', 'tournament']));
    }
}
