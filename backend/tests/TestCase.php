<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Testing\TestResponse;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

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
