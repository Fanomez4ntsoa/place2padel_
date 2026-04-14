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

    private function makeUser(array $profile = [], array $days = [], ?int $clubId = null): User
    {
        $u = User::factory()->create(['club_id' => $clubId]);
        UserProfile::create(array_merge([
            'user_id' => $u->id,
            'position' => 'both',
            'padel_points' => 1000,
        ], $profile));
        foreach ($days as $d) {
            UserAvailability::create(['user_id' => $u->id, 'day_of_week' => $d]);
        }
        return $u->fresh(['profile', 'availabilities']);
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
        $a = $this->makeUser(['position' => 'both'], [], $club->id);
        $b = $this->makeUser(['position' => 'both'], [], $club->id);
        $t = Tournament::factory()->create();

        // 20 (both) + 30 (level 0) + 0 (dispos) + 15 (même club) = 65.
        $this->assertSame(20 + 30 + 15, $this->invoke('contextualCompatibility', [$a, $b, $t]));
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
