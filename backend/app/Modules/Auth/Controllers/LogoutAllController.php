<?php

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Auth\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogoutAllController extends Controller
{
    public function __construct(private readonly AuthService $auth) {}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $count = $this->auth->logoutAll($user);

        return response()->json([
            'data' => ['revoked_tokens' => $count],
            'message' => 'Tous les tokens ont été révoqués.',
        ]);
    }
}
