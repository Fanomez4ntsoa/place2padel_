<?php

namespace App\Modules\FriendlyMatch\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\FriendlyMatch\Resources\UserEloResource;
use App\Modules\FriendlyMatch\Services\ELOService;

class ShowUserEloController extends Controller
{
    public function __invoke(User $user, ELOService $service): UserEloResource
    {
        $elo = $service->ensureForUser($user);

        return new UserEloResource($elo);
    }
}
