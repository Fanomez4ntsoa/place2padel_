<?php

namespace App\Modules\FriendlyMatch\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\FriendlyMatch\Requests\CreateFriendlyMatchRequest;
use App\Modules\FriendlyMatch\Resources\FriendlyMatchResource;
use App\Modules\FriendlyMatch\Services\FriendlyMatchService;

class CreateFriendlyMatchController extends Controller
{
    public function __invoke(CreateFriendlyMatchRequest $request, FriendlyMatchService $service): FriendlyMatchResource
    {
        $match = $service->create(
            creator: $request->user(),
            partnerUuid: $request->input('partner_uuid'),
            opp1Uuid: $request->input('opponent1_uuid'),
            opp2Uuid: $request->input('opponent2_uuid'),
        );

        return new FriendlyMatchResource($match);
    }
}
