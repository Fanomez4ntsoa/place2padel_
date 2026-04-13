<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LogoutTest extends TestCase
{
    use RefreshDatabase;

    private function access(User $user): string
    {
        return $user->createToken('access', ['*'], now()->addMinutes(60))->plainTextToken;
    }

    public function test_logout_revokes_current_token(): void
    {
        $user = User::factory()->create();
        $token = $this->access($user);

        $this->postJson('/api/v1/auth/logout', [], ['Authorization' => "Bearer {$token}"])
            ->assertOk()
            ->assertJson(['message' => 'Déconnecté.']);

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_revoked_token_cannot_be_reused(): void
    {
        $user = User::factory()->create();
        $token = $this->access($user);

        $this->postJson('/api/v1/auth/logout', [], ['Authorization' => "Bearer {$token}"])
            ->assertOk();

        $this->getJson('/api/v1/auth/me', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(401);
    }

    public function test_logout_all_revokes_every_token(): void
    {
        $user = User::factory()->create();

        $access1 = $this->access($user);
        $this->access($user);
        $user->createToken('refresh', ['refresh'], now()->addDays(7));
        $user->createToken('refresh', ['refresh'], now()->addDays(7));

        $response = $this->postJson('/api/v1/auth/logout-all', [], [
            'Authorization' => "Bearer {$access1}",
        ]);

        $response->assertOk()
            ->assertJsonPath('data.revoked_tokens', 4);

        $this->assertSame(0, $user->tokens()->count());
    }
}
