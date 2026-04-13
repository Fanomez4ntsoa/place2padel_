<?php

namespace Tests\Feature\Auth;

use App\Models\Club;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'email' => 'jean.dupont@gmail.com',
            'password' => 'Password123',
            'first_name' => 'Jean',
            'last_name' => 'Dupont',
        ], $overrides);
    }

    public function test_valid_registration_returns_201_with_user_and_token(): void
    {
        Event::fake([\App\Modules\Auth\Events\UserRegistered::class]);

        $response = $this->postJson('/api/v1/auth/register', $this->payload([
            'city' => 'Paris',
            'preferred_levels' => ['P100', 'P250'],
            'license_number' => 'FFT123456',
            'max_radius_km' => 50,
        ]));

        $response->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'user' => ['uuid', 'email', 'first_name', 'last_name', 'name', 'role', 'profile', 'preferred_levels'],
                    'token',
                ],
                'message',
            ])
            ->assertJsonPath('data.user.email', 'jean.dupont@gmail.com')
            ->assertJsonPath('data.user.role', 'player')
            ->assertJsonPath('data.user.name', 'Jean Dupont')
            ->assertJsonPath('data.user.preferred_levels', ['P100', 'P250']);

        $this->assertNotEmpty($response->json('data.token'));

        $user = User::where('email', 'jean.dupont@gmail.com')->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->profile);
        $this->assertSame('FFT123456', $user->profile->license_number);
        $this->assertSame(50, $user->profile->max_radius_km);
        $this->assertCount(2, $user->preferredLevels);
    }

    public function test_email_lowercased_and_trimmed(): void
    {
        Event::fake([\App\Modules\Auth\Events\UserRegistered::class]);

        $this->postJson('/api/v1/auth/register', $this->payload([
            'email' => '  JEAN.DUPONT@GMAIL.COM  ',
        ]))->assertCreated();

        $this->assertDatabaseHas('users', ['email' => 'jean.dupont@gmail.com']);
    }

    public function test_duplicate_email_returns_422(): void
    {
        Event::fake([\App\Modules\Auth\Events\UserRegistered::class]);

        User::factory()->create(['email' => 'jean.dupont@gmail.com']);

        $this->postJson('/api/v1/auth/register', $this->payload())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_weak_password_returns_422(): void
    {
        Event::fake([\App\Modules\Auth\Events\UserRegistered::class]);

        $this->postJson('/api/v1/auth/register', $this->payload([
            'password' => 'short',
        ]))->assertStatus(422)->assertJsonValidationErrors(['password']);

        $this->postJson('/api/v1/auth/register', $this->payload([
            'email' => 'other@gmail.com',
            'password' => 'onlyletters',
        ]))->assertStatus(422)->assertJsonValidationErrors(['password']);

        $this->postJson('/api/v1/auth/register', $this->payload([
            'email' => 'other2@gmail.com',
            'password' => '12345678',
        ]))->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_role_is_forced_to_player_even_if_admin_sent(): void
    {
        Event::fake([\App\Modules\Auth\Events\UserRegistered::class]);

        $response = $this->postJson('/api/v1/auth/register', $this->payload([
            'role' => 'admin',
        ]));

        $response->assertCreated()->assertJsonPath('data.user.role', 'player');

        $this->assertSame('player', User::where('email', 'jean.dupont@gmail.com')->value('role'));
    }

    public function test_invalid_preferred_level_returns_422(): void
    {
        Event::fake([\App\Modules\Auth\Events\UserRegistered::class]);

        $this->postJson('/api/v1/auth/register', $this->payload([
            'preferred_levels' => ['P999'],
        ]))->assertStatus(422)->assertJsonValidationErrors(['preferred_levels.0']);
    }

    public function test_unknown_club_uuid_returns_422(): void
    {
        Event::fake([\App\Modules\Auth\Events\UserRegistered::class]);

        $this->postJson('/api/v1/auth/register', $this->payload([
            'club_uuid' => '00000000-0000-7000-8000-000000000000',
        ]))->assertStatus(422)->assertJsonValidationErrors(['club_uuid']);
    }

    public function test_inactive_club_uuid_returns_422(): void
    {
        Event::fake([\App\Modules\Auth\Events\UserRegistered::class]);

        $club = Club::factory()->inactive()->create();

        $this->postJson('/api/v1/auth/register', $this->payload([
            'club_uuid' => $club->uuid,
        ]))->assertStatus(422)->assertJsonValidationErrors(['club_uuid']);
    }

    public function test_user_registered_event_dispatched(): void
    {
        Event::fake([\App\Modules\Auth\Events\UserRegistered::class]);

        $this->postJson('/api/v1/auth/register', $this->payload())->assertCreated();

        Event::assertDispatched(\App\Modules\Auth\Events\UserRegistered::class);
    }
}
