<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('auth:login:127.0.0.1:jean@gmail.com');
    }

    private function makeUser(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'email' => 'jean@gmail.com',
            'password' => Hash::make('Password123'),
        ], $overrides));
    }

    public function test_valid_login_returns_200_with_access_and_refresh_tokens(): void
    {
        $this->makeUser();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'jean@gmail.com',
            'password' => 'Password123',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'data' => ['user' => ['uuid', 'email'], 'access_token', 'refresh_token'],
                'message',
            ]);

        $this->assertNotEmpty($response->json('data.access_token'));
        $this->assertNotEmpty($response->json('data.refresh_token'));
        $this->assertNotSame(
            $response->json('data.access_token'),
            $response->json('data.refresh_token'),
        );
    }

    public function test_unknown_email_returns_401_with_generic_message(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'nobody@gmail.com',
            'password' => 'Password123',
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'Email ou mot de passe incorrect.']);
    }

    public function test_wrong_password_returns_same_generic_401(): void
    {
        $this->makeUser();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'jean@gmail.com',
            'password' => 'WrongPass999',
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'Email ou mot de passe incorrect.']);
    }

    public function test_google_only_account_cannot_login_with_password(): void
    {
        $this->makeUser([
            'password' => null,
            'auth_type' => 'google',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'jean@gmail.com',
            'password' => 'Password123',
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'Email ou mot de passe incorrect.']);
    }

    public function test_sixth_attempt_returns_429(): void
    {
        $this->makeUser();

        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'jean@gmail.com',
                'password' => 'WrongPass'.$i,
            ])->assertStatus(401);
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => 'jean@gmail.com',
            'password' => 'Password123',
        ])->assertStatus(429);
    }
}
