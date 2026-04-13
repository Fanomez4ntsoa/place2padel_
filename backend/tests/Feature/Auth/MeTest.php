<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MeTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_access_token_returns_user_structure(): void
    {
        $user = User::factory()->create();
        $user->profile()->create(['license_number' => 'FFT777']);
        $token = $user->createToken('access', ['*'], now()->addMinutes(60))->plainTextToken;

        $response = $this->getJson('/api/v1/auth/me', ['Authorization' => "Bearer {$token}"]);

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'uuid',
                    'email',
                    'first_name',
                    'last_name',
                    'name',
                    'role',
                    'profile' => ['license_number'],
                    'preferred_levels',
                    'availabilities',
                ],
            ])
            ->assertJsonPath('data.uuid', $user->uuid)
            ->assertJsonPath('data.profile.license_number', 'FFT777');
    }

    public function test_no_token_returns_401(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_refresh_token_rejected_on_me(): void
    {
        $user = User::factory()->create();
        $refresh = $user->createToken('refresh', ['refresh'], now()->addDays(7))->plainTextToken;

        $this->getJson('/api/v1/auth/me', ['Authorization' => "Bearer {$refresh}"])
            ->assertStatus(401);
    }
}
