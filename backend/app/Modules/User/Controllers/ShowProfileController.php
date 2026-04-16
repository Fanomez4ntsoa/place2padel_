<?php

namespace App\Modules\User\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\User\Resources\ProfileResource;
use Illuminate\Http\Request;

class ShowProfileController extends Controller
{
    public function __invoke(Request $request, User $user): ProfileResource
    {
        $user->load(['profile', 'clubs.club', 'preferredLevels', 'availabilities']);

        return new ProfileResource($user, $this->resolveViewer($request));
    }

    /**
     * Auth optionnelle : un refresh token ne compte PAS comme authentifié sur cet endpoint.
     */
    private function resolveViewer(Request $request): ?User
    {
        $viewer = auth('sanctum')->user();

        if (! $viewer instanceof User) {
            return null;
        }

        $token = $viewer->currentAccessToken();

        if ($token && ! in_array('*', (array) $token->abilities, true)) {
            return null;
        }

        return $viewer;
    }
}
