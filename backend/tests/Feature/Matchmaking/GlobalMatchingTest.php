<?php

namespace Tests\Feature\Matchmaking;

use App\Models\PlayerMatch;
use App\Models\Swipe;
use App\Models\User;
use App\Models\UserProfile;
use App\Modules\Matchmaking\Events\MatchCreated;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * Couverture complète du matching global amical Phase 4.2 :
 *   - GET /matching/candidates (auth optionnelle)
 *   - POST /matching/swipe (auth required, mutual like detection)
 *   - GET /matching/matches (auth required)
 *   - Algo globalCompatibility (pondérations Emergent exactes)
 */
class GlobalMatchingTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $u): string
    {
        return $u->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    private function headers(User $u): array
    {
        return ['Authorization' => "Bearer {$this->token($u)}"];
    }

    private function makeUser(array $userAttrs = [], array $profileAttrs = []): User
    {
        $user = User::factory()->create(array_merge(['role' => 'player'], $userAttrs));
        UserProfile::create(array_merge([
            'user_id' => $user->id,
            'position' => 'both',
            'padel_points' => 1000,
        ], $profileAttrs));
        return $user;
    }

    // =================================================================
    // GET /matching/candidates
    // =================================================================

    public function test_candidates_requires_nothing_for_public_browse(): void
    {
        $this->makeUser();
        $this->makeUser();

        $response = $this->getJson('/api/v1/matching/candidates');

        $response->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['authenticated', 'count']])
            ->assertJsonPath('meta.authenticated', false);
    }

    public function test_candidates_excludes_self(): void
    {
        $viewer = $this->makeUser();
        $this->makeUser(); // other

        $response = $this->getJson('/api/v1/matching/candidates', $this->headers($viewer));

        $response->assertOk();
        $uuids = collect($response->json('data'))->pluck('uuid')->all();
        $this->assertNotContains($viewer->uuid, $uuids);
    }

    public function test_candidates_excludes_admins(): void
    {
        $viewer = $this->makeUser();
        $admin = $this->makeUser(['role' => 'admin']);

        $response = $this->getJson('/api/v1/matching/candidates', $this->headers($viewer));

        $uuids = collect($response->json('data'))->pluck('uuid')->all();
        $this->assertNotContains($admin->uuid, $uuids);
    }

    public function test_candidates_excludes_already_swiped_users(): void
    {
        $viewer = $this->makeUser();
        $swiped = $this->makeUser();
        $notSwiped = $this->makeUser();

        Swipe::create([
            'from_user_id' => $viewer->id,
            'to_user_id' => $swiped->id,
            'action' => 'pass',
        ]);

        $response = $this->getJson('/api/v1/matching/candidates', $this->headers($viewer));
        $uuids = collect($response->json('data'))->pluck('uuid')->all();

        $this->assertNotContains($swiped->uuid, $uuids);
        $this->assertContains($notSwiped->uuid, $uuids);
    }

    public function test_candidates_hard_limit_20(): void
    {
        $viewer = $this->makeUser();
        for ($i = 0; $i < 30; $i++) {
            $this->makeUser();
        }

        $response = $this->getJson('/api/v1/matching/candidates', $this->headers($viewer));
        $this->assertLessThanOrEqual(20, count($response->json('data')));
    }

    public function test_candidates_returns_compatibility_for_authenticated_viewer(): void
    {
        $viewer = $this->makeUser([], ['position' => 'left', 'padel_points' => 500]);
        $this->makeUser([], ['position' => 'right', 'padel_points' => 500]);

        $response = $this->getJson('/api/v1/matching/candidates', $this->headers($viewer));

        $first = $response->json('data.0');
        $this->assertArrayHasKey('compatibility', $first);
        $this->assertIsInt($first['compatibility']);
    }

    public function test_candidates_hides_compatibility_for_public_viewer(): void
    {
        $this->makeUser();
        $this->makeUser();

        $response = $this->getJson('/api/v1/matching/candidates');

        $first = $response->json('data.0');
        $this->assertArrayNotHasKey('compatibility', $first);
    }

    // =================================================================
    // POST /matching/swipe
    // =================================================================

    public function test_swipe_requires_auth(): void
    {
        $target = $this->makeUser();

        $this->postJson('/api/v1/matching/swipe', [
            'target_uuid' => $target->uuid,
            'action' => 'like',
        ])->assertStatus(401);
    }

    public function test_swipe_like_not_mutual_returns_is_match_false(): void
    {
        Event::fake();
        $viewer = $this->makeUser();
        $target = $this->makeUser();

        $response = $this->postJson('/api/v1/matching/swipe', [
            'target_uuid' => $target->uuid,
            'action' => 'like',
        ], $this->headers($viewer));

        $response->assertOk()
            ->assertJsonPath('data.is_match', false)
            ->assertJsonPath('data.conversation_uuid', null);

        $this->assertDatabaseHas('swipes', [
            'from_user_id' => $viewer->id,
            'to_user_id' => $target->id,
            'action' => 'like',
        ]);
        $this->assertDatabaseCount('player_matches', 0);
        Event::assertNotDispatched(MatchCreated::class);
    }

    public function test_swipe_pass_never_creates_match_even_if_reverse_like_exists(): void
    {
        $viewer = $this->makeUser();
        $target = $this->makeUser();

        Swipe::create([
            'from_user_id' => $target->id,
            'to_user_id' => $viewer->id,
            'action' => 'like',
        ]);

        $response = $this->postJson('/api/v1/matching/swipe', [
            'target_uuid' => $target->uuid,
            'action' => 'pass',
        ], $this->headers($viewer));

        $response->assertOk()->assertJsonPath('data.is_match', false);
        $this->assertDatabaseCount('player_matches', 0);
    }

    public function test_mutual_like_creates_player_match_and_conversation(): void
    {
        Event::fake();
        $alice = $this->makeUser();
        $bob = $this->makeUser();

        // Alice like Bob en premier.
        $this->postJson('/api/v1/matching/swipe', [
            'target_uuid' => $bob->uuid,
            'action' => 'like',
        ], $this->headers($alice))->assertOk();

        // Bob like Alice → mutual.
        $response = $this->postJson('/api/v1/matching/swipe', [
            'target_uuid' => $alice->uuid,
            'action' => 'like',
        ], $this->headers($bob));

        $response->assertOk()
            ->assertJsonPath('data.is_match', true)
            ->assertJsonStructure(['data' => ['is_match', 'conversation_uuid', 'match_uuid']]);

        $this->assertNotNull($response->json('data.conversation_uuid'));
        $this->assertNotNull($response->json('data.match_uuid'));

        // Paire user_a_id < user_b_id.
        $a = min($alice->id, $bob->id);
        $b = max($alice->id, $bob->id);
        $this->assertDatabaseHas('player_matches', ['user_a_id' => $a, 'user_b_id' => $b]);
        $this->assertDatabaseHas('conversations', ['user_a_id' => $a, 'user_b_id' => $b]);

        Event::assertDispatched(MatchCreated::class, 1);
    }

    public function test_second_like_after_match_is_idempotent(): void
    {
        $alice = $this->makeUser();
        $bob = $this->makeUser();

        $this->postJson('/api/v1/matching/swipe', ['target_uuid' => $bob->uuid, 'action' => 'like'], $this->headers($alice));
        $this->postJson('/api/v1/matching/swipe', ['target_uuid' => $alice->uuid, 'action' => 'like'], $this->headers($bob));
        $this->assertDatabaseCount('player_matches', 1);

        // Un nouveau like d'Alice (écrase le swipe existant) ne doit pas créer un 2e match.
        $this->postJson('/api/v1/matching/swipe', ['target_uuid' => $bob->uuid, 'action' => 'like'], $this->headers($alice))
            ->assertOk()
            ->assertJsonPath('data.is_match', true);

        $this->assertDatabaseCount('player_matches', 1);
    }

    public function test_swipe_self_returns_422(): void
    {
        $viewer = $this->makeUser();

        $this->postJson('/api/v1/matching/swipe', [
            'target_uuid' => $viewer->uuid,
            'action' => 'like',
        ], $this->headers($viewer))->assertStatus(422);
    }

    public function test_swipe_invalid_action_returns_422(): void
    {
        $viewer = $this->makeUser();
        $target = $this->makeUser();

        $this->postJson('/api/v1/matching/swipe', [
            'target_uuid' => $target->uuid,
            'action' => 'super_like',
        ], $this->headers($viewer))->assertStatus(422);
    }

    public function test_swipe_unknown_target_returns_422(): void
    {
        $viewer = $this->makeUser();

        $this->postJson('/api/v1/matching/swipe', [
            'target_uuid' => '019d9549-f00f-73c9-0000-000000000000',
            'action' => 'like',
        ], $this->headers($viewer))->assertStatus(422);
    }

    public function test_swipe_upsert_overrides_previous_action(): void
    {
        $viewer = $this->makeUser();
        $target = $this->makeUser();

        $this->postJson('/api/v1/matching/swipe', ['target_uuid' => $target->uuid, 'action' => 'pass'], $this->headers($viewer))->assertOk();
        $this->postJson('/api/v1/matching/swipe', ['target_uuid' => $target->uuid, 'action' => 'like'], $this->headers($viewer))->assertOk();

        $this->assertDatabaseCount('swipes', 1);
        $this->assertDatabaseHas('swipes', [
            'from_user_id' => $viewer->id,
            'to_user_id' => $target->id,
            'action' => 'like',
        ]);
    }

    // =================================================================
    // GET /matching/matches
    // =================================================================

    public function test_matches_requires_auth(): void
    {
        $this->getJson('/api/v1/matching/matches')->assertStatus(401);
    }

    public function test_matches_lists_mutual_matches_with_conversation_uuid(): void
    {
        $alice = $this->makeUser();
        $bob = $this->makeUser();

        $this->postJson('/api/v1/matching/swipe', ['target_uuid' => $bob->uuid, 'action' => 'like'], $this->headers($alice));
        $this->postJson('/api/v1/matching/swipe', ['target_uuid' => $alice->uuid, 'action' => 'like'], $this->headers($bob));

        $response = $this->getJson('/api/v1/matching/matches', $this->headers($alice));

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'uuid',
                    'created_at',
                    'conversation_uuid',
                    'other' => ['uuid', 'name', 'picture_url'],
                ]],
            ])
            ->assertJsonPath('data.0.other.uuid', $bob->uuid);

        $this->assertNotNull($response->json('data.0.conversation_uuid'));
    }

    public function test_matches_empty_when_no_mutual_likes(): void
    {
        $viewer = $this->makeUser();
        $this->getJson('/api/v1/matching/matches', $this->headers($viewer))
            ->assertOk()
            ->assertJsonPath('data', []);
    }

    // =================================================================
    // Algorithme globalCompatibility — pondérations Emergent
    // =================================================================

    public function test_compatibility_complementary_positions_full_score(): void
    {
        $viewer = $this->makeUser([], ['position' => 'left', 'padel_points' => 1000]);
        $target = $this->makeUser([], ['position' => 'right', 'padel_points' => 1000]);

        $response = $this->getJson('/api/v1/matching/candidates', $this->headers($viewer));
        $candidate = collect($response->json('data'))->firstWhere('uuid', $target->uuid);

        // Position 30 (left↔right) + Level 30 (<500 diff) + Dispos 8 (aucune)
        // + Geo 2 (pas de club ni ville commune) = 70
        $this->assertSame(70, $candidate['compatibility']);
    }

    public function test_compatibility_same_position_gets_partial_score(): void
    {
        $viewer = $this->makeUser([], ['position' => 'left', 'padel_points' => 1000]);
        $target = $this->makeUser([], ['position' => 'left', 'padel_points' => 1000]);

        $response = $this->getJson('/api/v1/matching/candidates', $this->headers($viewer));
        $candidate = collect($response->json('data'))->firstWhere('uuid', $target->uuid);

        // Position 8 (même côté Emergent) + Level 30 + Dispos 8 + Geo 2 = 48
        $this->assertSame(48, $candidate['compatibility']);
    }

    public function test_compatibility_big_level_diff_reduces_score(): void
    {
        $viewer = $this->makeUser([], ['position' => 'left', 'padel_points' => 500]);
        $target = $this->makeUser([], ['position' => 'right', 'padel_points' => 15000]); // diff >= 10k

        $response = $this->getJson('/api/v1/matching/candidates', $this->headers($viewer));
        $candidate = collect($response->json('data'))->firstWhere('uuid', $target->uuid);

        // Position 30 + Level 3 (≥10k) + Dispos 8 + Geo 2 = 43
        $this->assertSame(43, $candidate['compatibility']);
    }

    public function test_compatibility_same_city_adds_geo_bonus(): void
    {
        $viewer = $this->makeUser(['city' => 'Paris'], ['position' => 'left', 'padel_points' => 1000]);
        $target = $this->makeUser(['city' => 'Paris'], ['position' => 'right', 'padel_points' => 1000]);

        $response = $this->getJson('/api/v1/matching/candidates', $this->headers($viewer));
        $candidate = collect($response->json('data'))->firstWhere('uuid', $target->uuid);

        // Position 30 + Level 30 + Dispos 8 + Geo 10 (même ville) = 78
        $this->assertSame(78, $candidate['compatibility']);
    }

    public function test_compatibility_capped_at_100(): void
    {
        $viewer = $this->makeUser(['city' => 'Paris'], ['position' => 'left', 'padel_points' => 1000]);
        $target = $this->makeUser(['city' => 'Paris'], ['position' => 'right', 'padel_points' => 1000]);

        // Avec dispos 3+ communs (25 pts) on dépasse 100 théorique sans cap.
        foreach ([1, 2, 3] as $day) {
            $viewer->availabilities()->create(['day_of_week' => $day, 'period' => 'evening']);
            $target->availabilities()->create(['day_of_week' => $day, 'period' => 'evening']);
        }

        $response = $this->getJson('/api/v1/matching/candidates', $this->headers($viewer));
        $candidate = collect($response->json('data'))->firstWhere('uuid', $target->uuid);

        // Position 30 + Level 30 + Dispos 25 + Geo 10 = 95 (cap pas atteint mais bon indicateur)
        $this->assertSame(95, $candidate['compatibility']);
    }

    public function test_candidates_ordered_same_city_before_others(): void
    {
        $viewer = $this->makeUser(['city' => 'Paris']);
        $parisUser = $this->makeUser(['city' => 'Paris']);
        $lyonUser = $this->makeUser(['city' => 'Lyon']);

        $response = $this->getJson('/api/v1/matching/candidates', $this->headers($viewer));
        $uuids = collect($response->json('data'))->pluck('uuid')->all();

        $parisIdx = array_search($parisUser->uuid, $uuids, true);
        $lyonIdx = array_search($lyonUser->uuid, $uuids, true);

        $this->assertNotFalse($parisIdx);
        $this->assertNotFalse($lyonIdx);
        $this->assertLessThan($lyonIdx, $parisIdx, 'Même ville doit passer avant ville différente');
    }

    // =================================================================
    // Integration : listener crée notifications
    // =================================================================

    public function test_mutual_match_creates_notifications_for_both_users(): void
    {
        $alice = $this->makeUser();
        $bob = $this->makeUser();

        $this->postJson('/api/v1/matching/swipe', ['target_uuid' => $bob->uuid, 'action' => 'like'], $this->headers($alice));
        $this->postJson('/api/v1/matching/swipe', ['target_uuid' => $alice->uuid, 'action' => 'like'], $this->headers($bob));

        $this->assertDatabaseHas('notifications', [
            'user_id' => $alice->id,
            'type' => 'match',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $bob->id,
            'type' => 'match',
        ]);
    }
}
