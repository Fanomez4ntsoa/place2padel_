<?php

namespace App\Modules\FriendlyMatch\Controllers;

use App\Http\Controllers\Controller;
use App\Models\FriendlyMatch;
use App\Modules\FriendlyMatch\Resources\FriendlyMatchResource;
use App\Modules\FriendlyMatch\Services\FriendlyMatchService;
use Illuminate\Http\Request;

class DeclineFriendlyMatchController extends Controller
{
    public function __invoke(Request $request, FriendlyMatch $friendlyMatch, FriendlyMatchService $service): FriendlyMatchResource
    {
        return new FriendlyMatchResource($service->decline($friendlyMatch, $request->user()));
    }
}
