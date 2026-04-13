<?php

namespace Tests\Feature\User;

use App\Models\Club;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShowProfileTest extends TestCase
{
    use RefreshDatabase;

    private function makeTarget(): User
    {
        $club = Club::factory()->create(['name' => 'Padel Club Paris', 'city' => 'Paris']);

        $user = User::factory()->create([
            'email' => 'target@gmail.com',
            'first_name' => 'Jean',
            'last_name' => 'Dupont',
            'name' => 'Jean Dupont',
            'city' => 'Paris',
            'club_id' => $club->id,
        ]);

        $user->profile()->create([
            'bio' => 'Joueur du dimanche',
            'position' => 'right',
            'padel_level' => 3,
            'license_number' => 'FFT123',
            'padel_points' => 8500,
            'ranking' => 1234,
            'region' => 'Île-de-France',
            'max_radius_km' => 50,
        ]);
        $user->preferredLevels()->create(['level' => 'P100']);
        $user->preferredLevels()->create(['level' => 'P250']);
        $user->availabilities()->create(['day_of_week' => 3]);

        return $user;
    }

    private function accessToken(User $user): string
    {
        return $user->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    public function test_anonymous_sees_only_public_fields(): void
    {
        $target = $this->makeTarget();

        $response = $this->getJson("/api/v1/profile/{$target->uuid}");

        $response->assertOk()
            ->assertJsonPath('data.uuid', $target->uuid)
            ->assertJsonPath('data.name', 'Jean Dupont')
            ->assertJsonPath('data.region', 'Île-de-France')
            ->assertJsonPath('data.padel_level', 3)
            ->assertJsonPath('data.ranking', 1234)
            ->assertJsonPath('data.padel_points', 8500)
            ->assertJsonPath('data.club.name', 'Padel Club Paris');

        // Champs privés absents
        $response->assertJsonMissingPath('data.email')
            ->assertJsonMissingPath('data.first_name')
            ->assertJsonMissingPath('data.last_name')
            ->assertJsonMissingPath('data.preferred_levels')
            ->assertJsonMissingPath('data.availabilities')
            ->assertJsonMissingPath('data.profile');
    }

    public function test_authed_other_user_sees_preferred_levels_and_availabilities(): void
    {
        $target = $this->makeTarget();
        $viewer = User::factory()->create();
        $token = $this->accessToken($viewer);

        $response = $this->getJson("/api/v1/profile/{$target->uuid}", [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk()
            ->assertJsonPath('data.preferred_levels', ['P100', 'P250'])
            ->assertJsonPath('data.availabilities', [3])
            // Toujours pas de champs self
            ->assertJsonMissingPath('data.email')
            ->assertJsonMissingPath('data.license_number')
            ->assertJsonMissingPath('data.profile');
    }

    public function test_self_sees_every_field(): void
    {
        $target = $this->makeTarget();
        $token = $this->accessToken($target);

        $response = $this->getJson("/api/v1/profile/{$target->uuid}", [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk()
            ->assertJsonPath('data.email', 'target@gmail.com')
            ->assertJsonPath('data.first_name', 'Jean')
            ->assertJsonPath('data.last_name', 'Dupont')
            ->assertJsonPath('data.role', 'player')
            ->assertJsonPath('data.profile.license_number', 'FFT123')
            ->assertJsonPath('data.profile.bio', 'Joueur du dimanche')
            ->assertJsonPath('data.profile.position', 'right')
            ->assertJsonPath('data.profile.max_radius_km', 50);
    }

    public function test_nonexistent_uuid_returns_404(): void
    {
        $this->getJson('/api/v1/profile/00000000-0000-7000-8000-000000000000')
            ->assertStatus(404);
    }

    public function test_soft_deleted_user_returns_404(): void
    {
        $target = $this->makeTarget();
        $target->delete();

        $this->getJson("/api/v1/profile/{$target->uuid}")
            ->assertStatus(404);
    }

    public function test_refresh_token_is_treated_as_anonymous(): void
    {
        $target = $this->makeTarget();
        $viewer = User::factory()->create();
        $refresh = $viewer->createToken('refresh', ['refresh'], now()->addDays(7))->plainTextToken;

        $response = $this->getJson("/api/v1/profile/{$target->uuid}", [
            'Authorization' => "Bearer {$refresh}",
        ]);

        $response->assertOk()
            ->assertJsonMissingPath('data.preferred_levels')
            ->assertJsonMissingPath('data.availabilities')
            ->assertJsonMissingPath('data.email');
    }
}
