<?php

namespace App\Modules\GameProposal\Controllers;

use App\Http\Controllers\Controller;
use App\Models\GameProposal;
use App\Modules\GameProposal\Resources\GameProposalResource;
use App\Modules\GameProposal\Services\GameProposalService;
use Illuminate\Http\Request;

class CancelGameProposalController extends Controller
{
    public function __invoke(Request $request, GameProposal $gameProposal, GameProposalService $service): GameProposalResource
    {
        return new GameProposalResource($service->cancel($gameProposal, $request->user()));
    }
}
