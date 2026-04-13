<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireAccessToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->user()?->currentAccessToken();

        if (! $token || ! in_array('*', (array) $token->abilities, true)) {
            abort(401, 'Non authentifié.');
        }

        return $next($request);
    }
}
