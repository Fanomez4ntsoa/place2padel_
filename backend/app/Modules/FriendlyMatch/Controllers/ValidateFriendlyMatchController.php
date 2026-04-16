<?php

namespace App\Modules\FriendlyMatch\Controllers;

use App\Http\Controllers\Controller;
use App\Models\FriendlyMatch;
use App\Modules\FriendlyMatch\Requests\ValidateFriendlyMatchRequest;
use App\Modules\FriendlyMatch\Resources\FriendlyMatchResource;
use App\Modules\FriendlyMatch\Services\FriendlyMatchService;

class ValidateFriendlyMatchController extends Controller
{
    public function __invoke(
        ValidateFriendlyMatchRequest $request,
        FriendlyMatch $friendlyMatch,
        FriendlyMatchService $service,
    ): FriendlyMatchResource {
        return new FriendlyMatchResource(
            $service->validate($friendlyMatch, $request->user(), (int) $request->input('team'))
        );
    }
}
