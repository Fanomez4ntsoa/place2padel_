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

        $this->call_patch($token, ['clubs' => ['00000000-0000-7000-8000-000000000000']])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['clubs.0']);
    }

    public function test_inactive_club_returns_422(): void
    {
        [, $token] = $this->authUser();
        $club = Club::factory()->inactive()->create();

        $this->call_patch($token, ['clubs' => [$club->uuid]])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['clubs.0']);
    }

    public function test_more_than_3_clubs_returns_422(): void
    {
        [, $token] = $this->authUser();
        $clubs = Club::factory()->count(4)->create();

        $this->call_patch($token, ['clubs' => $clubs->pluck('uuid')->all()])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['clubs']);
    }

    public function test_multi_clubs_replace_semantic(): void
    {
        [$user, $token] = $this->authUser();
        $clubA = Club::factory()->create();
        $clubB = Club::factory()->create();
        $clubC = Club::factory()->create();

        $this->call_patch($token, ['clubs' => [$clubA->uuid, $clubB->uuid, $clubC->uuid]])
            ->assertOk();

        $user->load('clubs');
        $this->assertSame(3, $user->clubs->count());
        $this->assertSame([1, 2, 3], $user->clubs->pluck('priority')->sort()->values()->all());

        // Replace avec 1 seul club → les 2 autres disparaissent.
        $this->call_patch($token, ['clubs' => [$clubB->uuid]])->assertOk();
        $user->load('clubs');
        $this->assertSame(1, $user->clubs->count());
        $this->assertSame($clubB->id, $user->clubs->first()->club_id);
        $this->assertSame(1, $user->clubs->first()->priority);
    }

    public function test_availabilities_flexible_slot(): void
    {
        [$user, $token] = $this->authUser();

        $this->call_patch($token, [
            'availabilities' => [
                ['day_of_week' => 1, 'period' => 'evening'],
                ['day_of_week' => null, 'period' => 'all'],
            ],
        ])->assertOk();

        $user->load('availabilities');
        $this->assertSame(2, $user->availabilities->count());
        $flex = $user->availabilities->firstWhere('day_of_week', null);
        $this->assertNotNull($flex);
        $this->assertSame('all', $flex->period);
    }

    public function test_availabilities_invalid_day_period_combo(): void
    {
        [, $token] = $this->authUser();

        // day_of_week null avec period != 'all' → invalide (seul Flexible est autorisé).
        $this->call_patch($token, [
            'availabilities' => [
                ['day_of_week' => null, 'period' => 'evening'],
            ],
        ])->assertStatus(422);

        // day_of_week 3 avec period 'all' → invalide (all réservé Flexible).
        $this->call_patch($token, [
            'availabilities' => [
                ['day_of_week' => 3, 'period' => 'all'],
            ],
        ])->assertStatus(422);
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
