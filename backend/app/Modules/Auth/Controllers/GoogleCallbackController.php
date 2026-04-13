<?php

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Auth\Resources\UserResource;
use App\Modules\Auth\Services\GoogleOAuthService;
use Illuminate\Http\JsonResponse;

class GoogleCallbackController extends Controller
{
    public function __construct(private readonly GoogleOAuthService $oauth) {}

    public function __invoke(): JsonResponse
    {
        $result = $this->oauth->handleCallback();

        return response()->json([
            'data' => [
                'user' => new UserResource($result['user']),
                'access_token' => $result['access_token'],
                'refresh_token' => $result['refresh_token'],
            ],
            'message' => $result['created'] ? 'Compte Google créé.' : 'Connexion Google réussie.',
        ], $result['created'] ? 201 : 200);
    }
}
