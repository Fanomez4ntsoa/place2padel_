<?php

namespace App\Modules\GameProposal\Controllers;

use App\Http\Controllers\Controller;
use App\Models\GameProposal;
use App\Modules\GameProposal\Requests\RespondGameProposalRequest;
use App\Modules\GameProposal\Resources\GameProposalResource;
use App\Modules\GameProposal\Services\GameProposalService;

class RespondGameProposalController extends Controller
{
    public function __invoke(
        RespondGameProposalRequest $request,
        GameProposal $gameProposal,
        GameProposalService $service,
    ): GameProposalResource {
        return new GameProposalResource(
            $service->respond($gameProposal, $request->user(), $request->input('response'))
        );
    }
}
