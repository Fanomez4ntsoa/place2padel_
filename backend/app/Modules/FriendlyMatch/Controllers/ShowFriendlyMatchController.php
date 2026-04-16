<?php

namespace App\Modules\FriendlyMatch\Controllers;

use App\Http\Controllers\Controller;
use App\Models\FriendlyMatch;
use App\Modules\FriendlyMatch\Resources\FriendlyMatchResource;

class ShowFriendlyMatchController extends Controller
{
    public function __invoke(FriendlyMatch $friendlyMatch): FriendlyMatchResource
    {
        return new FriendlyMatchResource($friendlyMatch->load(['participants.user', 'creator']));
    }
}
