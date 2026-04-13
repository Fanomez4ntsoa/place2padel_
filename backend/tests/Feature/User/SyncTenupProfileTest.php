<?php

namespace Tests\Feature\User;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SyncTenupProfileTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        return $user->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    private function seedRanking(array $overrides = []): void
    {
        DB::table('tenup_rankings')->insert(array_merge([
            'name' => 'Jean Dupont',
            'first_name' => 'Jean',
            'last_name' => 'DUPONT',
            'ranking' => 1234,
            'points' => 8500,
            'evolution' => '+5',
            'gender' => 'masculin',
            'country' => 'FR',
            'region' => 'Île-de-France',
        ], $overrides));
    }

    public function test_sync_with_match_updates_profile(): void
    {
        $user = User::factory()->create(['first_name' => 'Jean', 'last_name' => 'Dupont']);
        $user->profile()->create(['padel_points' => 0]);
        $this->seedRanking();

        $response = $this->postJson('/api/v1/tenup/sync-profile', [], [
            'Authorization' => "Bearer {$this->token($user)}",
        ]);

        $response->assertOk()
            ->assertJsonPath('data.synced', true)
            ->assertJsonPath('data.ranking.points', 8500)
            ->assertJsonPath('data.ranking.ranking', 1234)
            ->assertJsonPath('data.ranking.region', 'Île-de-France');

        $profile = $user->fresh()->profile;
        $this->assertSame(8500, $profile->padel_points);
        $this->assertSame(1234, $profile->ranking);
        $this->assertNotNull($profile->tenup_synced_at);
    }

    public function test_sync_without_match_returns_synced_false(): void
    {
        $user = User::factory()->create(['first_name' => 'Pierre', 'last_name' => 'Inconnu']);
        $user->profile()->create(['padel_points' => 0]);
        $this->seedRanking(); // Jean Dupont — pas le bon nom

        $response = $this->postJson('/api/v1/tenup/sync-profile', [], [
            'Authorization' => "Bearer {$this->token($user)}",
        ]);

        $response->assertOk()
            ->assertJsonPath('data.synced', false)
            ->assertJsonStructure(['data' => ['synced'], 'message']);

        $this->assertSame(0, $user->fresh()->profile->padel_points);
    }

    public function test_missing_first_name_returns_422(): void
    {
        $user = User::factory()->create(['first_name' => 'X', 'last_name' => 'Doe']);
        $user->profile()->create();
        // Bypass validation Eloquent : on simule un user dont first_name est vide
        // (cas défensif — guard du controller, normalement non atteignable via PATCH).
        DB::table('users')->where('id', $user->id)->update(['first_name' => '']);

        $this->postJson('/api/v1/tenup/sync-profile', [], [
            'Authorization' => "Bearer {$this->token($user)}",
        ])->assertStatus(422);
    }

    public function test_missing_last_name_returns_422(): void
    {
        $user = User::factory()->create(['first_name' => 'Jean', 'last_name' => 'X']);
        $user->profile()->create();
        DB::table('users')->where('id', $user->id)->update(['last_name' => '']);

        $this->postJson('/api/v1/tenup/sync-profile', [], [
            'Authorization' => "Bearer {$this->token($user)}",
        ])->assertStatus(422);
    }

    public function test_no_token_returns_401(): void
    {
        $this->postJson('/api/v1/tenup/sync-profile')->assertStatus(401);
    }

    public function test_refresh_token_returns_401(): void
    {
        $user = User::factory()->create();
        $refresh = $user->createToken('refresh', ['refresh'], now()->addDays(7))->plainTextToken;

        $this->postJson('/api/v1/tenup/sync-profile', [], [
            'Authorization' => "Bearer {$refresh}",
        ])->assertStatus(401);
    }

    public function test_sixth_call_returns_429(): void
    {
        $user = User::factory()->create(['first_name' => 'Jean', 'last_name' => 'Dupont']);
        $user->profile()->create();
        $this->seedRanking();
        $token = $this->token($user);
        $headers = ['Authorization' => "Bearer {$token}"];

        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/api/v1/tenup/sync-profile', [], $headers)->assertOk();
        }

        $this->postJson('/api/v1/tenup/sync-profile', [], $headers)->assertStatus(429);
    }
}
