<?php

namespace App\Modules\GameProposal\Controllers;

use App\Http\Controllers\Controller;
use App\Models\GameProposal;
use App\Modules\GameProposal\Requests\StartGameProposalRequest;
use App\Modules\GameProposal\Services\GameProposalService;
use Illuminate\Http\JsonResponse;

class StartGameProposalController extends Controller
{
    public function __invoke(
        StartGameProposalRequest $request,
        GameProposal $gameProposal,
        GameProposalService $service,
    ): JsonResponse {
        $result = $service->start(
            proposal: $gameProposal,
            creator: $request->user(),
            partnerUuid: $request->input('partner_uuid'),
            opp1Uuid: $request->input('opponent1_uuid'),
            opp2Uuid: $request->input('opponent2_uuid'),
        );

        return response()->json([
            'data' => [
                'proposal_uuid' => $result['proposal']->uuid,
                'friendly_match_uuid' => $result['friendly_match_uuid'],
            ],
            'message' => 'Partie lancée — match amical créé.',
        ]);
    }
}
