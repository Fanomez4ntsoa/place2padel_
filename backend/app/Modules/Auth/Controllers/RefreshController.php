<?php

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Auth\Requests\StoreRefreshRequest;
use App\Modules\Auth\Services\AuthService;
use Illuminate\Http\JsonResponse;

class RefreshController extends Controller
{
    public function __construct(private readonly AuthService $auth) {}

    public function __invoke(StoreRefreshRequest $request): JsonResponse
    {
        $result = $this->auth->refresh($request->string('refresh_token')->toString());

        return response()->json([
            'data' => [
                'access_token' => $result['access_token'],
                'refresh_token' => $result['refresh_token'],
            ],
            'message' => 'Tokens rafraîchis.',
        ]);
    }
}
