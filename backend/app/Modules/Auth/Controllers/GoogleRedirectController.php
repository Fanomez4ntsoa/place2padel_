<?php

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Laravel\Socialite\Facades\Socialite;

class GoogleRedirectController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $url = Socialite::driver('google')
            ->stateless()
            ->scopes(['openid', 'email', 'profile'])
            ->redirect()
            ->getTargetUrl();

        return response()->json([
            'data' => ['redirect_url' => $url],
        ]);
    }
}
