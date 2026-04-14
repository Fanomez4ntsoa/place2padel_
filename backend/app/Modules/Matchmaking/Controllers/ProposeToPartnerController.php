<?php

namespace App\Modules\Matchmaking\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Models\User;
use App\Modules\Matchmaking\Requests\ProposeToPartnerRequest;
use App\Modules\Matchmaking\Resources\ProposalResource;
use App\Modules\Matchmaking\Services\MatchmakingService;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ProposeToPartnerController extends Controller
{
    public function __invoke(
        ProposeToPartnerRequest $request,
        Tournament $tournament,
        MatchmakingService $service,
    ): ProposalResource {
        $from = $request->user();
        $to = User::where('uuid', $request->input('target_user_uuid'))->firstOrFail();

        // Cible pertinente : doit avoir une interest seeking-partner active sur ce tournoi.
        $targetSeeking = $tournament->interests()->where('user_id', $to->id)->exists();
        if (! $targetSeeking) {
            throw new HttpException(422, 'Ce joueur ne cherche pas de partenaire sur ce tournoi.');
        }

        $proposal = $service->createProposal(
            from: $from,
            to: $to,
            tournament: $tournament,
            payload: $request->filled('message') ? ['message' => $request->input('message')] : null,
        );

        return new ProposalResource($proposal->load(['fromUser', 'toUser', 'tournament']));
    }
}
