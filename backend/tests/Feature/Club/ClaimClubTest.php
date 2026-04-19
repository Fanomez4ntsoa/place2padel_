<?php

namespace Tests\Feature\Club;

use App\Models\Club;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClaimClubTest extends TestCase
{
    use RefreshDatabase;

    private function clubOwner(): User
    {
        return User::factory()->create(['role' => 'club_owner']);
    }

    private function authHeader(User $user): array
    {
        $token = $user->createToken('access', ['*'])->plainTextToken;

        return ['Authorization' => "Bearer {$token}"];
    }

    public function test_club_owner_claims_an_unowned_club_by_uuid(): void
    {
        $user = $this->clubOwner();
        $club = Club::factory()->create(['owner_id' => null, 'is_active' => true]);

        $response = $this->withHeaders($this->authHeader($user))
            ->postJson('/api/v1/clubs/claim', [
                'club_uuid' => $club->uuid,
                'club_type' => 'associatif',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.uuid', $club->uuid)
            ->assertJsonPath('data.club_type', 'associatif');

        $club->refresh();
        $this->assertSame($user->id, $club->owner_id);
        $this->assertNotNull($club->claimed_at);
    }

    public function test_club_owner_claims_by_name_fuzzy_match(): void
    {
        $user = $this->clubOwner();
        $club = Club::factory()->create([
            'name' => '4Padel Paris 20',
            'owner_id' => null,
            'is_active' => true,
        ]);

        $response = $this->withHeaders($this->authHeader($user))
            ->postJson('/api/v1/clubs/claim', [
                'club_name' => '4Padel Paris',
                'club_type' => 'prive',
            ]);

        $response->assertOk();
        $this->assertSame($user->id, $club->fresh()->owner_id);
    }

    public function test_player_cannot_claim_a_club(): void
    {
        $user = User::factory()->create(['role' => 'player']);
        $club = Club::factory()->create(['owner_id' => null]);

        $response = $this->withHeaders($this->authHeader($user))
            ->postJson('/api/v1/clubs/claim', [
                'club_uuid' => $club->uuid,
                'club_type' => 'associatif',
            ]);

        $response->assertStatus(403);
    }

    public function test_claim_fails_when_club_already_has_a_different_owner(): void
    {
        $original = $this->clubOwner();
        $intruder = $this->clubOwner();
        $club = Club::factory()->create(['owner_id' => $original->id]);

        $response = $this->withHeaders($this->authHeader($intruder))
            ->postJson('/api/v1/clubs/claim', [
                'club_uuid' => $club->uuid,
                'club_type' => 'associatif',
            ]);

        $response->assertStatus(409);
    }

    public function test_admin_can_reassign_a_claimed_club(): void
    {
        $original = $this->clubOwner();
        $admin = User::factory()->create(['role' => 'admin']);
        $club = Club::factory()->create(['owner_id' => $original->id]);

        $response = $this->withHeaders($this->authHeader($admin))
            ->postJson('/api/v1/clubs/claim', [
                'club_uuid' => $club->uuid,
                'club_type' => 'prive',
            ]);

        $response->assertOk();
        $this->assertSame($admin->id, $club->fresh()->owner_id);
    }

    public function test_claim_is_idempotent_for_same_owner(): void
    {
        $user = $this->clubOwner();
        $club = Club::factory()->create(['owner_id' => $user->id]);

        $response = $this->withHeaders($this->authHeader($user))
            ->postJson('/api/v1/clubs/claim', [
                'club_uuid' => $club->uuid,
                'club_type' => 'prive',
            ]);

        $response->assertOk();
    }

    public function test_claim_requires_club_uuid_or_club_name(): void
    {
        $user = $this->clubOwner();

        $response = $this->withHeaders($this->authHeader($user))
            ->postJson('/api/v1/clubs/claim', [
                'club_type' => 'associatif',
            ]);

        $response->assertStatus(422);
    }

    public function test_claim_requires_valid_club_type(): void
    {
        $user = $this->clubOwner();
        $club = Club::factory()->create(['owner_id' => null]);

        $response = $this->withHeaders($this->authHeader($user))
            ->postJson('/api/v1/clubs/claim', [
                'club_uuid' => $club->uuid,
                'club_type' => 'invalid',
            ]);

        $response->assertStatus(422);
    }

    public function test_claim_returns_404_when_club_name_matches_nothing(): void
    {
        $user = $this->clubOwner();

        $response = $this->withHeaders($this->authHeader($user))
            ->postJson('/api/v1/clubs/claim', [
                'club_name' => 'ClubTotallyInexistent12345',
                'club_type' => 'associatif',
            ]);

        $response->assertStatus(404);
    }

    public function test_register_accepts_club_owner_role(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'patron@gmail.com',
            'password' => 'Password123',
            'first_name' => 'Patrick',
            'last_name' => 'Patron',
            'role' => 'club_owner',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'patron@gmail.com',
            'role' => 'club_owner',
        ]);
    }
}
