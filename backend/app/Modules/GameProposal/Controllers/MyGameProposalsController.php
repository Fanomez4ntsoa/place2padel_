<?php

namespace App\Modules\GameProposal\Controllers;

use App\Http\Controllers\Controller;
use App\Models\GameProposal;
use App\Modules\GameProposal\Resources\GameProposalResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MyGameProposalsController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $userId = $request->user()->id;

        // Propositions créées OU reçues, hors cancelled.
        $proposals = GameProposal::query()
            ->with(['invitees.user', 'creator', 'friendlyMatch'])
            ->where(function ($q) use ($userId) {
                $q->where('creator_id', $userId)
                    ->orWhereHas('invitees', fn ($sub) => $sub->where('user_id', $userId));
            })
            ->where('status', '!=', 'cancelled')
            ->orderByDesc('date')
            ->orderByDesc('time')
            ->get();

        return GameProposalResource::collection($proposals);
    }
}
