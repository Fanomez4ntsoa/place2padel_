<?php

namespace Tests\Feature\User;

use App\Models\Club;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UpdateProfileTest extends TestCase
{
    use RefreshDatabase;

    private function authUser(): array
    {
        $user = User::factory()->create([
            'first_name' => 'Jean',
            'last_name' => 'Dupont',
            'name' => 'Jean Dupont',
        ]);
        $user->profile()->create([
            'padel_points' => 5000,
            'ranking' => 9999,
        ]);
        $token = $user->createToken('access', ['*'], now()->addHour())->plainTextToken;
        return [$user, $token];
    }

    private function call_patch(string $token, array $payload)
    {
        return $this->patchJson('/api/v1/profile', $payload, [
            'Authorization' => "Bearer {$token}",
        ]);
    }

    public function test_valid_update_returns_200(): void
    {
        [$user, $token] = $this->authUser();

        $response = $this->call_patch($token, [
            'first_name' => 'Pierre',
            'preferred_levels' => ['P100', 'P250'],
            'bio' => 'Nouveau bio',
            'max_radius_km' => 75,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.first_name', 'Pierre')
            ->assertJsonPath('data.name', 'Pierre Dupont')
            ->assertJsonPath('data.preferred_levels', ['P100', 'P250'])
            ->assertJsonPath('data.profile.bio', 'Nouveau bio')
            ->assertJsonPath('data.profile.max_radius_km', 75);

        $this->assertSame('Pierre Dupont', $user->fresh()->name);
        $this->assertCount(2, $user->preferredLevels()->get());
    }

    public function test_padel_points_is_silently_ignored(): void
    {
        [$user, $token] = $this->authUser();

        $this->call_patch($token, ['padel_points' => 99999])->assertOk();

        $this->assertSame(5000, $user->fresh()->profile->padel_points);
    }

    public function test_ranking_is_silently_ignored(): void
    {
        [$user, $token] = $this->authUser();

        $this->call_patch($token, ['ranking' => 1])->assertOk();

        $this->assertSame(9999, $user->fresh()->profile->ranking);
    }

    public function test_invalid_preferred_level_returns_422(): void
    {
        [, $token] = $this->authUser();

        $this->call_patch($token, ['preferred_levels' => ['P999']])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['preferred_levels.0']);
    }

    public function test_padel_level_out_of_bounds_returns_422(): void
    {
        [, $token] = $this->authUser();

        $this->call_patch($token, ['padel_level' => 0])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['padel_level']);

        $this->call_patch($token, ['padel_level' => 6])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['padel_level']);
    }

    public function test_negative_max_radius_returns_422(): void
    {
        [, $token] = $this->authUser();

        $this->call_patch($token, ['max_radius_km' => -5])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['max_radius_km']);
    }

    public function test_unknown_club_uuid_returns_422(): void
    {
        [, $token] = $this->authUser();

        $this->call_patch($token, ['club_uuid' => '00000000-0000-7000-8000-000000000000'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['club_uuid']);
    }

    public function test_inactive_club_returns_422(): void
    {
        [, $token] = $this->authUser();
        $club = Club::factory()->inactive()->create();

        $this->call_patch($token, ['club_uuid' => $club->uuid])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['club_uuid']);
    }

    public function test_no_token_returns_401(): void
    {
        $this->patchJson('/api/v1/profile', ['first_name' => 'X'])->assertStatus(401);
    }

    public function test_refresh_token_returns_401(): void
    {
        $user = User::factory()->create();
        $refresh = $user->createToken('refresh', ['refresh'], now()->addDays(7))->plainTextToken;

        $this->patchJson('/api/v1/profile', ['first_name' => 'X'], [
            'Authorization' => "Bearer {$refresh}",
        ])->assertStatus(401);
    }
}
