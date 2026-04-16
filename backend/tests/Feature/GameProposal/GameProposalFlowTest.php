<?php

namespace Tests\Feature\GameProposal;

use App\Models\FriendlyMatch;
use App\Models\GameProposal;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GameProposalFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $creator;
    private User $inv1;
    private User $inv2;
    private User $inv3;

    protected function setUp(): void
    {
        parent::setUp();
        $this->creator = $this->makePlayer();
        $this->inv1 = $this->makePlayer();
        $this->inv2 = $this->makePlayer();
        $this->inv3 = $this->makePlayer();
    }

    private function makePlayer(): User
    {
        $u = User::factory()->create();
        UserProfile::create(['user_id' => $u->id, 'padel_level' => 5]);
        return $u;
    }

    private function asUser(User $user): self
    {
        $token = $user->createToken('access', ['*'], now()->addHour())->plainTextToken;
        return $this->withHeader('Authorization', 'Bearer '.$token);
    }

    private function validPayload(array $invited): array
    {
        return [
            'date' => now()->addDays(3)->toDateString(),
            'time' => '18:30',
            'duration_min' => 90,
            'club' => 'Padel Club Agde',
            'club_city' => 'Agde',
            'invitee_uuids' => $invited,
        ];
    }

    // ─── CREATE ────────────────────────────────────────────────

    public function test_create_proposal_with_3_invitees(): void
    {
        $res = $this->asUser($this->creator)
            ->postJson('/api/v1/game-proposals', $this->validPayload([
                $this->inv1->uuid, $this->inv2->uuid, $this->inv3->uuid,
            ]))
            ->assertSuccessful();

        $uuid = $res->json('data.uuid');
        $this->assertDatabaseHas('game_proposals', ['uuid' => $uuid, 'status' => 'open']);
        $this->assertDatabaseCount('game_proposal_invitees', 3);
        $this->assertSame(1, $res->json('data.accepted_count')); // creator auto-accepté
    }

    public function test_create_rejects_empty_invitees(): void
    {
        $this->asUser($this->creator)
            ->postJson('/api/v1/game-proposals', $this->validPayload([]))
            ->assertStatus(422);
    }

    public function test_create_rejects_self_invite(): void
    {
        $this->asUser($this->creator)
            ->postJson('/api/v1/game-proposals', $this->validPayload([$this->creator->uuid]))
            ->assertStatus(422);
    }

    public function test_create_rejects_duplicate_invitees(): void
    {
        $this->asUser($this->creator)
            ->postJson('/api/v1/game-proposals', $this->validPayload([
                $this->inv1->uuid, $this->inv1->uuid,
            ]))
            ->assertStatus(422);
    }

    public function test_create_rejects_past_date(): void
    {
        $this->asUser($this->creator)
            ->postJson('/api/v1/game-proposals', [
                'date' => now()->subDays(1)->toDateString(),
                'time' => '18:30',
                'invitee_uuids' => [$this->inv1->uuid],
            ])
            ->assertStatus(422);
    }

    public function test_create_rejects_more_than_10_invitees(): void
    {
        $extras = collect(range(1, 11))->map(fn () => $this->makePlayer()->uuid)->all();
        $this->asUser($this->creator)
            ->postJson('/api/v1/game-proposals', $this->validPayload($extras))
            ->assertStatus(422);
    }

    public function test_create_requires_auth(): void
    {
        $this->postJson('/api/v1/game-proposals', $this->validPayload([$this->inv1->uuid]))
            ->assertStatus(401);
    }

    // ─── RESPOND ───────────────────────────────────────────────

    private function createProposal(): string
    {
        return $this->asUser($this->creator)
            ->postJson('/api/v1/game-proposals', $this->validPayload([
                $this->inv1->uuid, $this->inv2->uuid, $this->inv3->uuid,
            ]))
            ->json('data.uuid');
    }

    public function test_respond_accepted_by_invitee(): void
    {
        $uuid = $this->createProposal();

        $this->asUser($this->inv1)
            ->putJson("/api/v1/game-proposals/{$uuid}/respond", ['response' => 'accepted'])
            ->assertSuccessful()
            ->assertJsonPath('data.accepted_count', 2);
    }

    public function test_respond_refused_stays_open_but_tracks(): void
    {
        $uuid = $this->createProposal();

        $this->asUser($this->inv1)
            ->putJson("/api/v1/game-proposals/{$uuid}/respond", ['response' => 'refused'])
            ->assertSuccessful()
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.accepted_count', 1); // creator seul
    }

    public function test_third_acceptance_marks_proposal_full(): void
    {
        $uuid = $this->createProposal();

        foreach ([$this->inv1, $this->inv2, $this->inv3] as $u) {
            $this->asUser($u)->putJson("/api/v1/game-proposals/{$uuid}/respond", ['response' => 'accepted'])
                ->assertSuccessful();
        }

        $this->assertDatabaseHas('game_proposals', ['uuid' => $uuid, 'status' => 'full']);
    }

    public function test_respond_by_non_invitee_returns_403(): void
    {
        $uuid = $this->createProposal();
        $outsider = $this->makePlayer();

        $this->asUser($outsider)
            ->putJson("/api/v1/game-proposals/{$uuid}/respond", ['response' => 'accepted'])
            ->assertStatus(403);
    }

    public function test_respond_on_cancelled_proposal_fails(): void
    {
        $uuid = $this->createProposal();
        $this->asUser($this->creator)->deleteJson("/api/v1/game-proposals/{$uuid}")->assertSuccessful();

        $this->asUser($this->inv1)
            ->putJson("/api/v1/game-proposals/{$uuid}/respond", ['response' => 'accepted'])
            ->assertStatus(422);
    }

    // ─── CANCEL ────────────────────────────────────────────────

    public function test_creator_can_cancel(): void
    {
        $uuid = $this->createProposal();

        $this->asUser($this->creator)
            ->deleteJson("/api/v1/game-proposals/{$uuid}")
            ->assertSuccessful()
            ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_non_creator_cannot_cancel(): void
    {
        $uuid = $this->createProposal();

        $this->asUser($this->inv1)
            ->deleteJson("/api/v1/game-proposals/{$uuid}")
            ->assertStatus(403);
    }

    // ─── START ─────────────────────────────────────────────────

    public function test_start_requires_4_accepted(): void
    {
        $uuid = $this->createProposal();
        // Seul le creator est accepté (1/4) → start refusé.
        $this->asUser($this->creator)
            ->postJson("/api/v1/game-proposals/{$uuid}/start", [
                'partner_uuid' => $this->inv1->uuid,
                'opponent1_uuid' => $this->inv2->uuid,
                'opponent2_uuid' => $this->inv3->uuid,
            ])
            ->assertStatus(422);
    }

    public function test_start_rejects_role_for_non_accepted_player(): void
    {
        $uuid = $this->createProposal();
        foreach ([$this->inv1, $this->inv2, $this->inv3] as $u) {
            $this->asUser($u)->putJson("/api/v1/game-proposals/{$uuid}/respond", ['response' => 'accepted']);
        }

        $stranger = $this->makePlayer();
        $this->asUser($this->creator)
            ->postJson("/api/v1/game-proposals/{$uuid}/start", [
                'partner_uuid' => $stranger->uuid, // pas dans les invités
                'opponent1_uuid' => $this->inv2->uuid,
                'opponent2_uuid' => $this->inv3->uuid,
            ])
            ->assertStatus(422);
    }

    public function test_non_creator_cannot_start(): void
    {
        $uuid = $this->createProposal();
        foreach ([$this->inv1, $this->inv2, $this->inv3] as $u) {
            $this->asUser($u)->putJson("/api/v1/game-proposals/{$uuid}/respond", ['response' => 'accepted']);
        }

        $this->asUser($this->inv1)
            ->postJson("/api/v1/game-proposals/{$uuid}/start", [
                'partner_uuid' => $this->inv2->uuid,
                'opponent1_uuid' => $this->creator->uuid,
                'opponent2_uuid' => $this->inv3->uuid,
            ])
            ->assertStatus(403);
    }

    public function test_start_creates_friendly_match_status_accepted(): void
    {
        $uuid = $this->createProposal();
        foreach ([$this->inv1, $this->inv2, $this->inv3] as $u) {
            $this->asUser($u)->putJson("/api/v1/game-proposals/{$uuid}/respond", ['response' => 'accepted']);
        }

        $res = $this->asUser($this->creator)
            ->postJson("/api/v1/game-proposals/{$uuid}/start", [
                'partner_uuid' => $this->inv1->uuid,
                'opponent1_uuid' => $this->inv2->uuid,
                'opponent2_uuid' => $this->inv3->uuid,
            ])
            ->assertSuccessful();

        $matchUuid = $res->json('data.friendly_match_uuid');
        $this->assertNotEmpty($matchUuid);

        // Match créé directement en status=accepted (bypass pending), 4 participants tous accepted.
        $match = FriendlyMatch::where('uuid', $matchUuid)->first();
        $this->assertSame('accepted', $match->status);
        $this->assertCount(4, $match->participants);
        foreach ($match->participants as $p) {
            $this->assertNotNull($p->accepted_at);
        }

        // Proposition passe à status=started avec pointeur vers le match.
        $proposal = GameProposal::where('uuid', $uuid)->first();
        $this->assertSame('started', $proposal->status);
        $this->assertSame($match->id, $proposal->friendly_match_id);
    }

    // ─── MY ────────────────────────────────────────────────────

    public function test_my_returns_own_and_received_but_not_cancelled(): void
    {
        $uuid = $this->createProposal();

        $res = $this->asUser($this->inv1)->getJson('/api/v1/game-proposals/my')->assertSuccessful();
        $this->assertCount(1, $res->json('data'));
        $this->assertSame($uuid, $res->json('data.0.uuid'));

        // Après cancel, n'apparaît plus.
        $this->asUser($this->creator)->deleteJson("/api/v1/game-proposals/{$uuid}");
        $this->asUser($this->inv1)->getJson('/api/v1/game-proposals/my')
            ->assertSuccessful()
            ->assertJsonCount(0, 'data');
    }
}
