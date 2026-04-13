<?php

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Auth\Resources\UserResource;
use Illuminate\Http\Request;

class MeController extends Controller
{
    public function __invoke(Request $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();

        $user->load(['profile', 'club', 'preferredLevels', 'availabilities']);

        return new UserResource($user);
    }
}
