<?php

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Auth\Requests\StoreLoginRequest;
use App\Modules\Auth\Resources\UserResource;
use App\Modules\Auth\Services\AuthService;
use Illuminate\Http\JsonResponse;

class LoginController extends Controller
{
    public function __construct(private readonly AuthService $auth) {}

    public function __invoke(StoreLoginRequest $request): JsonResponse
    {
        $result = $this->auth->login(
            $request->validated(),
            $request->ip() ?? 'unknown',
        );

        return response()->json([
            'data' => [
                'user' => new UserResource($result['user']),
                'access_token' => $result['access_token'],
                'refresh_token' => $result['refresh_token'],
            ],
            'message' => 'Connexion réussie.',
        ]);
    }
}
