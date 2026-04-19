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
                    'access_token',
                    'refresh_token',
                ],
                'message',
            ])
            ->assertJsonPath('data.user.email', 'jean.dupont@gmail.com')
            ->assertJsonPath('data.user.role', 'player')
            ->assertJsonPath('data.user.name', 'Jean Dupont')
            ->assertJsonPath('data.user.preferred_levels', ['P100', 'P250']);

        $this->assertNotEmpty($response->json('data.access_token'));
        $this->assertNotEmpty($response->json('data.refresh_token'));
        $this->assertNotSame(
            $response->json('data.access_token'),
            $response->json('data.refresh_token'),
        );

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

    public function test_admin_role_is_refused_at_register(): void
    {
        Event::fake([\App\Modules\Auth\Events\UserRegistered::class]);

        // admin hors whitelist → 422, aucun user créé.
        $this->postJson('/api/v1/auth/register', $this->payload([
            'role' => 'admin',
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['role']);

        $this->assertDatabaseMissing('users', ['email' => 'jean.dupont@gmail.com']);
    }

    public function test_organizer_role_is_refused_at_register(): void
    {
        Event::fake([\App\Modules\Auth\Events\UserRegistered::class]);

        // organizer également hors whitelist (role legacy non exposé à l'inscription publique).
        $this->postJson('/api/v1/auth/register', $this->payload([
            'role' => 'organizer',
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    public function test_referee_role_is_accepted_at_register(): void
    {
        Event::fake([\App\Modules\Auth\Events\UserRegistered::class]);

        $response = $this->postJson('/api/v1/auth/register', $this->payload([
            'role' => 'referee',
        ]));

        $response->assertCreated()->assertJsonPath('data.user.role', 'referee');

        $this->assertSame('referee', User::where('email', 'jean.dupont@gmail.com')->value('role'));
    }

    public function test_default_role_is_player_when_not_sent(): void
    {
        Event::fake([\App\Modules\Auth\Events\UserRegistered::class]);

        $response = $this->postJson('/api/v1/auth/register', $this->payload());

        $response->assertCreated()->assertJsonPath('data.user.role', 'player');
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
