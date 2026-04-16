<?php

namespace Tests\Feature\FriendlyMatch;

use App\Models\FriendlyMatch;
use App\Models\User;
use App\Models\UserElo;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Feature tests du cycle complet d'un match amical : create → accept → start →
 * score → validate × 2 → completed + ELO applied.
 */
class FriendlyMatchFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $creator;
    private User $partner;
    private User $opp1;
    private User $opp2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->creator = $this->makePlayer(5);
        $this->partner = $this->makePlayer(5);
        $this->opp1 = $this->makePlayer(5);
        $this->opp2 = $this->makePlayer(5);
    }

    private function makePlayer(int $level): User
    {
        $user = User::factory()->create();
        UserProfile::create(['user_id' => $user->id, 'padel_level' => $level]);
        return $user;
    }

    private function asUser(User $user): self
    {
        $token = $user->createToken('access', ['*'], now()->addHour())->plainTextToken;
        return $this->withHeader('Authorization', 'Bearer '.$token);
    }

    private function createMatch(): string
    {
        $res = $this->asUser($this->creator)->postJson('/api/v1/friendly-matches', [
            'partner_uuid' => $this->partner->uuid,
            'opponent1_uuid' => $this->opp1->uuid,
            'opponent2_uuid' => $this->opp2->uuid,
        ])->assertStatus(200);

        return $res->json('data.uuid');
    }

    // ─── CREATE ────────────────────────────────────────────────

    public function test_create_friendly_match_returns_4_participants_and_freezes_elo(): void
    {
        $uuid = $this->createMatch();

        $this->assertDatabaseHas('friendly_matches', ['uuid' => $uuid, 'status' => 'pending']);

        $match = FriendlyMatch::where('uuid', $uuid)->first();
        $this->assertCount(4, $match->participants);

        // Elo before figé à 5.0 pour tous (declared_level=5 locked).
        $eloBefore = $match->elo_before;
        $this->assertEquals(5.0, $eloBefore['team1_slot1']);
        $this->assertEquals(5.0, $eloBefore['team1_slot2']);
        $this->assertEquals(5.0, $eloBefore['team2_slot1']);
        $this->assertEquals(5.0, $eloBefore['team2_slot2']);

        // 4 user_elos créés.
        $this->assertDatabaseCount('user_elos', 4);
    }

    public function test_create_rejects_duplicate_players(): void
    {
        $this->asUser($this->creator)->postJson('/api/v1/friendly-matches', [
            'partner_uuid' => $this->creator->uuid, // self = duplicate
            'opponent1_uuid' => $this->opp1->uuid,
            'opponent2_uuid' => $this->opp2->uuid,
        ])->assertStatus(422);
    }

    public function test_create_rejects_unknown_partner(): void
    {
        $this->asUser($this->creator)->postJson('/api/v1/friendly-matches', [
            'partner_uuid' => '00000000-0000-0000-0000-000000000000',
            'opponent1_uuid' => $this->opp1->uuid,
            'opponent2_uuid' => $this->opp2->uuid,
        ])->assertStatus(422); // fail exists validation
    }

    public function test_create_requires_auth(): void
    {
        $this->postJson('/api/v1/friendly-matches', [
            'partner_uuid' => $this->partner->uuid,
            'opponent1_uuid' => $this->opp1->uuid,
            'opponent2_uuid' => $this->opp2->uuid,
        ])->assertStatus(401);
    }

    // ─── ACCEPT / DECLINE ──────────────────────────────────────

    public function test_accept_by_partner_keeps_pending(): void
    {
        $uuid = $this->createMatch();

        $this->asUser($this->partner)->putJson("/api/v1/friendly-matches/{$uuid}/accept")
            ->assertOk()
            ->assertJsonPath('data.status', 'pending'); // pas encore 4/4
    }

    public function test_accept_by_all_four_transitions_to_accepted(): void
    {
        $uuid = $this->createMatch();

        foreach ([$this->partner, $this->opp1, $this->opp2] as $u) {
            $this->asUser($u)->putJson("/api/v1/friendly-matches/{$uuid}/accept")->assertOk();
        }

        $this->assertDatabaseHas('friendly_matches', ['uuid' => $uuid, 'status' => 'accepted']);
    }

    public function test_accept_by_non_participant_returns_403(): void
    {
        $uuid = $this->createMatch();
        $outsider = $this->makePlayer(4);

        $this->asUser($outsider)->putJson("/api/v1/friendly-matches/{$uuid}/accept")
            ->assertStatus(403);
    }

    public function test_decline_sets_status_declined(): void
    {
        $uuid = $this->createMatch();

        $this->asUser($this->opp1)->deleteJson("/api/v1/friendly-matches/{$uuid}/accept")
            ->assertOk()
            ->assertJsonPath('data.status', 'declined');
    }

    // ─── START ─────────────────────────────────────────────────

    public function test_start_requires_accepted_status(): void
    {
        $uuid = $this->createMatch();
        // Status=pending → start refusé.
        $this->asUser($this->creator)->putJson("/api/v1/friendly-matches/{$uuid}/start")
            ->assertStatus(422);
    }

    public function test_start_after_full_accept_sets_in_progress(): void
    {
        $uuid = $this->acceptAll();

        $this->asUser($this->creator)->putJson("/api/v1/friendly-matches/{$uuid}/start")
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        $this->assertNotNull(FriendlyMatch::where('uuid', $uuid)->value('started_at'));
    }

    // ─── SCORE ─────────────────────────────────────────────────

    public function test_update_score_works_for_any_participant(): void
    {
        $uuid = $this->startMatch();

        $this->asUser($this->partner)
            ->putJson("/api/v1/friendly-matches/{$uuid}/score", [
                'team1_games' => 6,
                'team2_games' => 3,
            ])
            ->assertOk()
            ->assertJsonPath('data.score.team1_games', 6);
    }

    public function test_score_requires_tiebreak_at_8_8(): void
    {
        $uuid = $this->startMatch();

        $this->asUser($this->creator)
            ->putJson("/api/v1/friendly-matches/{$uuid}/score", [
                'team1_games' => 8, 'team2_games' => 8,
            ])
            ->assertStatus(422);
    }

    public function test_score_accepts_valid_tiebreak(): void
    {
        $uuid = $this->startMatch();

        $this->asUser($this->creator)
            ->putJson("/api/v1/friendly-matches/{$uuid}/score", [
                'team1_games' => 8, 'team2_games' => 8,
                'tiebreak_team1' => 10, 'tiebreak_team2' => 8,
            ])
            ->assertOk();
    }

    public function test_non_participant_cannot_score(): void
    {
        $uuid = $this->startMatch();
        $outsider = $this->makePlayer(4);

        $this->asUser($outsider)
            ->putJson("/api/v1/friendly-matches/{$uuid}/score", [
                'team1_games' => 6, 'team2_games' => 3,
            ])
            ->assertStatus(403);
    }

    public function test_score_resets_validations(): void
    {
        $uuid = $this->startMatch();

        // Score + validate team1 → validated_by_team1 = true.
        $this->asUser($this->creator)->putJson("/api/v1/friendly-matches/{$uuid}/score", [
            'team1_games' => 6, 'team2_games' => 3,
        ])->assertOk();
        $this->asUser($this->creator)->putJson("/api/v1/friendly-matches/{$uuid}/validate", ['team' => 1])->assertOk();

        // Re-score → reset.
        $this->asUser($this->creator)->putJson("/api/v1/friendly-matches/{$uuid}/score", [
            'team1_games' => 7, 'team2_games' => 3,
        ])->assertOk();

        $m = FriendlyMatch::where('uuid', $uuid)->first();
        $this->assertFalse($m->validated_by_team1);
    }

    // ─── VALIDATE ──────────────────────────────────────────────

    public function test_validate_by_captain_only(): void
    {
        $uuid = $this->startMatch();
        $this->asUser($this->creator)->putJson("/api/v1/friendly-matches/{$uuid}/score", [
            'team1_games' => 6, 'team2_games' => 3,
        ])->assertOk();

        // Partner = team1 slot2, pas captain → 403.
        $this->asUser($this->partner)
            ->putJson("/api/v1/friendly-matches/{$uuid}/validate", ['team' => 1])
            ->assertStatus(403);
    }

    public function test_double_validation_completes_match_and_applies_elo(): void
    {
        $uuid = $this->startMatch();

        $this->asUser($this->creator)->putJson("/api/v1/friendly-matches/{$uuid}/score", [
            'team1_games' => 6, 'team2_games' => 3,
        ])->assertOk();

        $this->asUser($this->creator)->putJson("/api/v1/friendly-matches/{$uuid}/validate", ['team' => 1])->assertOk();
        $this->asUser($this->opp1)->putJson("/api/v1/friendly-matches/{$uuid}/validate", ['team' => 2])->assertOk();

        $m = FriendlyMatch::where('uuid', $uuid)->first();
        $this->assertSame('completed', $m->status);
        $this->assertSame(1, $m->winner_team);

        // ELO : 4 egal (5.0), winner_avg=5.0, loser_avg=5.0 → 5.15 / 4.85.
        $creatorElo = UserElo::where('user_id', $this->creator->id)->first();
        $oppElo = UserElo::where('user_id', $this->opp1->id)->first();
        $this->assertEqualsWithDelta(5.15, (float) $creatorElo->elo_level, 0.001);
        $this->assertEqualsWithDelta(4.85, (float) $oppElo->elo_level, 0.001);

        // Toujours locked (1 match < 10).
        $this->assertTrue((bool) $creatorElo->is_locked);
        $this->assertSame(1, $creatorElo->matches_played);
        $this->assertSame(1, $creatorElo->matches_won);
    }

    public function test_validate_rejects_missing_score(): void
    {
        $uuid = $this->startMatch();

        $this->asUser($this->creator)
            ->putJson("/api/v1/friendly-matches/{$uuid}/validate", ['team' => 1])
            ->assertStatus(422);
    }

    // ─── ELO / HISTORY / LEADERBOARD ───────────────────────────

    public function test_show_user_elo_creates_record_on_first_access(): void
    {
        // 201 car JsonResource::make détecte la création (ensureForUser INSERT).
        // Status 200 ou 201 acceptable côté API mobile (même structure).
        $this->asUser($this->creator)
            ->getJson("/api/v1/users/{$this->partner->uuid}/elo")
            ->assertSuccessful()
            ->assertJsonPath('data.declared_level', 5)
            ->assertJsonPath('data.is_locked', true)
            ->assertJsonPath('data.matches_to_unlock', 10);
    }

    public function test_match_history_returns_completed_matches(): void
    {
        $uuid = $this->startMatch();

        $this->asUser($this->creator)->putJson("/api/v1/friendly-matches/{$uuid}/score", [
            'team1_games' => 6, 'team2_games' => 3,
        ])->assertOk();
        $this->asUser($this->creator)->putJson("/api/v1/friendly-matches/{$uuid}/validate", ['team' => 1])->assertOk();
        $this->asUser($this->opp1)->putJson("/api/v1/friendly-matches/{$uuid}/validate", ['team' => 2])->assertOk();

        $res = $this->asUser($this->creator)
            ->getJson("/api/v1/users/{$this->creator->uuid}/match-history")
            ->assertOk();

        $this->assertCount(1, $res->json('data'));
        $this->assertSame('win', $res->json('data.0.result'));
    }

    public function test_my_friendly_matches_filtered_by_status(): void
    {
        $uuid = $this->createMatch();

        $res = $this->asUser($this->partner)
            ->getJson('/api/v1/friendly-matches/my?status=pending')
            ->assertOk();

        $this->assertCount(1, $res->json('data'));
        $this->assertSame($uuid, $res->json('data.0.uuid'));
    }

    public function test_leaderboard_friends_shows_unlocked_only(): void
    {
        // Aucun user unlocked (aucun n'a joué 10 matchs) → liste vide.
        $res = $this->asUser($this->creator)->getJson('/api/v1/leaderboard/friends')->assertOk();
        $this->assertCount(0, $res->json('data'));
    }

    public function test_leaderboard_club_returns_hint_if_no_club(): void
    {
        $res = $this->asUser($this->creator)->getJson('/api/v1/leaderboard/club')->assertOk();
        $this->assertCount(0, $res->json('data'));
        $this->assertSame('Sélectionne un club pour voir le classement.', $res->json('meta.hint'));
    }

    // ─── HELPERS ───────────────────────────────────────────────

    private function acceptAll(): string
    {
        $uuid = $this->createMatch();
        foreach ([$this->partner, $this->opp1, $this->opp2] as $u) {
            $this->asUser($u)->putJson("/api/v1/friendly-matches/{$uuid}/accept")->assertOk();
        }
        return $uuid;
    }

    private function startMatch(): string
    {
        $uuid = $this->acceptAll();
        $this->asUser($this->creator)->putJson("/api/v1/friendly-matches/{$uuid}/start")->assertOk();
        return $uuid;
    }
}
