<?php

namespace Tests\Feature\Tournament;

use App\Models\Tournament;
use App\Models\TournamentTeam;
use App\Models\User;
use App\Modules\Tournament\Services\MatchEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListMatchesTest extends TestCase
{
    use RefreshDatabase;

    private function seedTournament(int $teams): Tournament
    {
        $t = Tournament::factory()->create();
        for ($i = 0; $i < $teams; $i++) {
            $u = User::factory()->create();
            TournamentTeam::create([
                'tournament_id' => $t->id,
                'captain_id' => $u->id,
                'captain_name' => $u->name,
                'captain_points' => 1000 - $i,
                'team_points' => 1000 - $i,
                'team_name' => 'Eq. '.($i + 1),
                'status' => 'registered',
            ]);
        }
        app(MatchEngineService::class)->generateInitial($t);
        return $t;
    }

    public function test_list_matches_public(): void
    {
        $t = $this->seedTournament(4); // format poules, 6 matchs

        $res = $this->getJson("/api/v1/tournaments/{$t->uuid}/matches");

        $res->assertOk()->assertJsonCount(6, 'data');
        $res->assertJsonStructure(['data' => [['uuid', 'phase', 'bloc', 'team1', 'team2', 'score', 'status', 'pool_uuid']]]);
    }

    public function test_filter_by_phase(): void
    {
        $t = $this->seedTournament(8); // elimination, 4 matchs bracket

        $res = $this->getJson("/api/v1/tournaments/{$t->uuid}/matches?phase=bracket");
        $res->assertOk()->assertJsonCount(4, 'data');

        $res = $this->getJson("/api/v1/tournaments/{$t->uuid}/matches?phase=poule");
        $res->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_filter_by_status_and_bloc(): void
    {
        $t = $this->seedTournament(8);

        $res = $this->getJson("/api/v1/tournaments/{$t->uuid}/matches?status=pending&bloc=main");
        $res->assertOk()->assertJsonCount(4, 'data');
    }

    public function test_invalid_filter_returns_422(): void
    {
        $t = $this->seedTournament(4);

        $this->getJson("/api/v1/tournaments/{$t->uuid}/matches?status=bogus")
            ->assertStatus(422);
    }
}
