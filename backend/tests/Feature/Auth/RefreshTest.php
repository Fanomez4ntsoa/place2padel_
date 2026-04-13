<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RefreshTest extends TestCase
{
    use RefreshDatabase;

    private function tokens(User $user): array
    {
        $access = $user->createToken('access', ['*'], now()->addMinutes(60))->plainTextToken;
        $refresh = $user->createToken('refresh', ['refresh'], now()->addDays(7))->plainTextToken;
        return compact('access', 'refresh');
    }

    public function test_valid_refresh_returns_200_with_new_pair(): void
    {
        $user = User::factory()->create();
        $tokens = $this->tokens($user);

        $response = $this->postJson('/api/v1/auth/refresh', [
            'refresh_token' => $tokens['refresh'],
        ]);

        $response->assertOk()
            ->assertJsonStructure(['data' => ['access_token', 'refresh_token'], 'message']);

        $this->assertNotSame($tokens['refresh'], $response->json('data.refresh_token'));
        $this->assertNotSame($tokens['access'], $response->json('data.access_token'));
    }

    public function test_old_refresh_is_revoked_after_rotation(): void
    {
        $user = User::factory()->create();
        $tokens = $this->tokens($user);

        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $tokens['refresh']])
            ->assertOk();

        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $tokens['refresh']])
            ->assertStatus(401);
    }

    public function test_access_token_rejected_on_refresh_endpoint(): void
    {
        $user = User::factory()->create();
        $tokens = $this->tokens($user);

        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $tokens['access']])
            ->assertStatus(401);
    }

    public function test_expired_refresh_token_rejected(): void
    {
        $user = User::factory()->create();
        $expired = $user->createToken('refresh', ['refresh'], now()->subMinute())->plainTextToken;

        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $expired])
            ->assertStatus(401);
    }
}
