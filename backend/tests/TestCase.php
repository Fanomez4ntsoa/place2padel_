<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Testing\TestResponse;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Flush cache entre chaque test — évite le leak de state rate-limiter.
        // `CACHE_STORE=array` (phpunit.xml) garde le cache en mémoire pour le
        // processus PHPUnit complet ; sans flush, les tests suivants héritent
        // des compteurs throttle des tests précédents et reçoivent 429.
        //
        // Couvre à la fois :
        //  - `throttle:N,M` middleware inline (register/reset/waitlist/…)
        //  - `RateLimiter::hit/clear($key)` explicite (AuthService login)
        //
        // Les tests qui valident intentionnellement le rate-limiter (ex : 6ᵉ
        // tentative login = 429) font tous leurs appels DANS UN MÊME test,
        // donc la setUp ne s'intercale pas — compatibles.
        Cache::flush();
        RateLimiter::clear('');

        // Force stateless API auth during tests. Sanctum's default config falls
        // back to the 'web' session guard and treats localhost as stateful —
        // both mask revoked-token behaviour across sequential HTTP test calls.
        config([
            'sanctum.stateful' => [],
            'sanctum.guard' => [],
        ]);
    }

    /**
     * Override test HTTP calls to reset cached guards.
     *
     * Laravel reuses the container between ->postJson/->getJson calls in the
     * same test, so the Sanctum RequestGuard keeps its cached $user from the
     * first request and skips token validation on the second one — hiding
     * real authentication bugs. Real HTTP requests don't have this issue.
     */
    public function call($method, $uri, $parameters = [], $cookies = [], $files = [], $server = [], $content = null): TestResponse
    {
        Auth::forgetGuards();
        return parent::call($method, $uri, $parameters, $cookies, $files, $server, $content);
    }
}
