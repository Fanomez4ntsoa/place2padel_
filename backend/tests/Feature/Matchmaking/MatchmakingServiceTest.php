<?php

namespace Tests\Feature\Matchmaking;

use App\Models\Club;
use App\Models\Proposal;
use App\Models\Tournament;
use App\Models\User;
use App\Models\UserAvailability;
use App\Models\UserProfile;
use App\Modules\Matchmaking\Services\MatchmakingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class MatchmakingServiceTest extends TestCase
{
    use RefreshDatabase;

    private MatchmakingService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(MatchmakingService::class);
    }

    private function invoke(string $method, array $args): mixed
    {
        $r = new \ReflectionMethod($this->service, $method);
        $r->setAccessible(true);
        return $r->invoke($this->service, ...$args);
    }

    /**
     * @param  array<int,int>|array<int,array{day_of_week:?int,period:string}>  $days
     *   Liste des jours (int 1-7, period auto 'evening') ou tuples complets.
     * @param  array<int,int>  $clubIds  Liste de club_id à associer (max 3, priority 1..N).
     */
    private function makeUser(array $profile = [], array $days = [], array $clubIds = []): User
    {
        $u = User::factory()->create();
        UserProfile::create(array_merge([
            'user_id' => $u->id,
            'position' => 'both',
            'padel_points' => 1000,
        ], $profile));
        foreach ($days as $d) {
            if (is_array($d)) {
                UserAvailability::create([
                    'user_id' => $u->id,
                    'day_of_week' => $d['day_of_week'] ?? null,
                    'period' => $d['period'] ?? 'all',
                ]);
            } else {
                // Shortcut : int = jour + période par défaut 'evening'.
                UserAvailability::create([
                    'user_id' => $u->id,
                    'day_of_week' => (int) $d,
                    'period' => 'evening',
                ]);
            }
        }
        $priority = 1;
        foreach ($clubIds as $clubId) {
            $u->clubs()->create(['club_id' => $clubId, 'priority' => $priority++]);
        }
        return $u->fresh(['profile', 'availabilities', 'clubs']);
    }

    public function test_position_complementaire_max_30(): void
    {
        $a = $this->makeUser(['position' => 'left', 'padel_points' => 10000]);
        $b = $this->makeUser(['position' => 'right', 'padel_points' => 10000]);
        // Pas de dispos, pas de club commun — seul la position + niveau (écart 0 → 30) contribue.
        $t = Tournament::factory()->create();

        $score = $this->invoke('contextualCompatibility', [$a, $b, $t]);
        $this->assertSame(30 + 30, $score); // position 30 + niveau 30
    }

    public function test_niveau_proche_max_30(): void
    {
        $a = $this->makeUser(['position' => 'both', 'padel_points' => 1200]);
        $b = $this->makeUser(['position' => 'both', 'padel_points' => 1300]); // diff 100 → 30
        $t = Tournament::factory()->create();

        // position both/both → 20 ; niveau <500 → 30 ; dispos 0 → 0 ; club null → 0.
        $this->assertSame(20 + 30, $this->invoke('contextualCompatibility', [$a, $b, $t]));
    }

    public function test_dispos_3_jours_communs_max_25(): void
    {
        $a = $this->makeUser(['position' => 'both'], [1, 2, 3]);
        $b = $this->makeUser(['position' => 'both'], [1, 2, 3, 6]);
        $t = Tournament::factory()->create();

        // 20 (position both) + 30 (level diff 0) + 25 (3 jours communs) = 75.
        $this->assertSame(20 + 30 + 25, $this->invoke('contextualCompatibility', [$a, $b, $t]));
    }

    public function test_meme_club_max_15(): void
    {
        $club = Club::factory()->create();
        $a = $this->makeUser(['position' => 'both'], [], [$club->id]);
        $b = $this->makeUser(['position' => 'both'], [], [$club->id]);
        $t = Tournament::factory()->create();

        // 20 (both) + 30 (level 0) + 0 (dispos) + 15 (≥ 1 club commun) = 65.
        $this->assertSame(20 + 30 + 15, $this->invoke('contextualCompatibility', [$a, $b, $t]));
    }

    public function test_intersection_partielle_clubs_donne_15(): void
    {
        $clubA = Club::factory()->create();
        $clubB = Club::factory()->create();
        $clubC = Club::factory()->create();
        // a joue à {A, B}, b joue à {B, C} → 1 club commun (B) → 15 pts.
        $a = $this->makeUser(['position' => 'both'], [], [$clubA->id, $clubB->id]);
        $b = $this->makeUser(['position' => 'both'], [], [$clubB->id, $clubC->id]);
        $t = Tournament::factory()->create();

        $this->assertSame(20 + 30 + 15, $this->invoke('contextualCompatibility', [$a, $b, $t]));
    }

    public function test_flexible_match_tous_slots_autre(): void
    {
        // a Flexible + b a 3 slots concrets → overlap 3 → 25 pts dispos.
        $a = $this->makeUser(['position' => 'both'], [['day_of_week' => null, 'period' => 'all']]);
        $b = $this->makeUser(['position' => 'both'], [1, 2, 3]);
        $t = Tournament::factory()->create();

        $this->assertSame(20 + 30 + 25, $this->invoke('contextualCompatibility', [$a, $b, $t]));
    }

    public function test_overlap_tuples_day_period_strict(): void
    {
        // a dispo lundi soir, b dispo lundi matin → 0 slot commun malgré même jour.
        $a = $this->makeUser(['position' => 'both'], [['day_of_week' => 1, 'period' => 'evening']]);
        $b = $this->makeUser(['position' => 'both'], [['day_of_week' => 1, 'period' => 'morning']]);
        $t = Tournament::factory()->create();

        $this->assertSame(20 + 30 + 0, $this->invoke('contextualCompatibility', [$a, $b, $t]));
    }

    public function test_normalize_pair_returns_min_max(): void
    {
        $this->assertSame([3, 7], $this->invoke('normalizePair', [7, 3]));
        $this->assertSame([3, 7], $this->invoke('normalizePair', [3, 7]));
        $this->assertSame([5, 5], $this->invoke('normalizePair', [5, 5])); // edge identique.
    }

    public function test_proposal_quota_throws_at_3_pending(): void
    {
        $from = User::factory()->create();
        $to = User::factory()->create();
        $t = Tournament::factory()->create();

        for ($i = 0; $i < 3; $i++) {
            Proposal::create([
                'type' => 'tournament_partner',
                'from_user_id' => $from->id,
                'to_user_id' => $to->id,
                'tournament_id' => $t->id,
                'status' => 'pending',
            ]);
        }

        $this->expectException(HttpException::class);
        $this->invoke('assertProposalQuotaAvailable', [$from, $to, $t]);
    }
}
