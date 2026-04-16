<?php

namespace App\Modules\FriendlyMatch\Controllers;

use App\Http\Controllers\Controller;
use App\Models\FriendlyMatch;
use App\Modules\FriendlyMatch\Requests\UpdateFriendlyScoreRequest;
use App\Modules\FriendlyMatch\Resources\FriendlyMatchResource;
use App\Modules\FriendlyMatch\Services\FriendlyMatchService;

class UpdateFriendlyScoreController extends Controller
{
    public function __invoke(
        UpdateFriendlyScoreRequest $request,
        FriendlyMatch $friendlyMatch,
        FriendlyMatchService $service,
    ): FriendlyMatchResource {
        return new FriendlyMatchResource(
            $service->updateScore($friendlyMatch, $request->user(), $request->validated())
        );
    }
}
