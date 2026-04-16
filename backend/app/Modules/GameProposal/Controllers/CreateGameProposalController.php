<?php

namespace App\Modules\GameProposal\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\GameProposal\Requests\CreateGameProposalRequest;
use App\Modules\GameProposal\Resources\GameProposalResource;
use App\Modules\GameProposal\Services\GameProposalService;

class CreateGameProposalController extends Controller
{
    public function __invoke(CreateGameProposalRequest $request, GameProposalService $service): GameProposalResource
    {
        $proposal = $service->create(
            creator: $request->user(),
            inviteeUuids: $request->input('invitee_uuids'),
            schedule: [
                'date' => $request->input('date'),
                'time' => $request->input('time'),
                'duration_min' => $request->input('duration_min'),
                'club' => $request->input('club'),
                'club_city' => $request->input('club_city'),
            ],
        );

        return new GameProposalResource($proposal);
    }
}
