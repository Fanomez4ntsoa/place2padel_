<?php

namespace Tests\Feature\Tournament;

use App\Models\Tournament;
use App\Models\TournamentMatch;
use App\Models\TournamentTeam;
use App\Models\User;
use App\Modules\Tournament\Services\MatchEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListPoolsTest extends TestCase
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

    public function test_list_pools_public_empty_standings_initially(): void
    {
        $t = $this->seedTournament(9); // 3 pools

        $res = $this->getJson("/api/v1/tournaments/{$t->uuid}/pools");

        $res->assertOk()->assertJsonCount(3, 'data');
        $res->assertJsonStructure(['data' => [['uuid', 'pool_name', 'pool_type', 'team_ids', 'standings']]]);

        foreach ($res->json('data') as $pool) {
            foreach ($pool['standings'] as $row) {
                $this->assertSame(0, $row['played']);
                $this->assertSame(0, $row['points']);
            }
        }
    }

    public function test_pools_empty_for_elimination_format(): void
    {
        $t = $this->seedTournament(8); // bracket, pas de pool
        $this->getJson("/api/v1/tournaments/{$t->uuid}/pools")
            ->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_standings_reflect_completed_matches(): void
    {
        $t = $this->seedTournament(4); // poule unique, 6 matchs
        $pool = $t->pools()->first();

        // Complète 1 match : teamA bat teamB 9-3.
        $m = $t->matches()->first();
        $m->team1_games = 9;
        $m->team2_games = 3;
        $m->status = 'completed';
        $m->winner_team_id = $m->team1_id;
        $m->save();

        $res = $this->getJson("/api/v1/tournaments/{$t->uuid}/pools");

        $row = collect($res->json('data.0.standings'))
            ->firstWhere('team_id', $m->team1_id);
        $this->assertSame(1, $row['won']);
        $this->assertSame(2, $row['points']);
        $this->assertSame(9, $row['games_for']);
        $this->assertSame(3, $row['games_against']);
        $this->assertSame(6, $row['game_diff']);

        // Le winner est premier (tri points DESC).
        $this->assertSame($m->team1_id, $res->json('data.0.standings.0.team_id'));
    }

    public function test_standings_expose_team_name_and_seed(): void
    {
        $t = $this->seedTournament(4);
        $winner = TournamentTeam::where('tournament_id', $t->id)->first();

        $res = $this->getJson("/api/v1/tournaments/{$t->uuid}/pools");

        $row = collect($res->json('data.0.standings'))
            ->firstWhere('team_id', $winner->id);
        $this->assertSame($winner->team_name, $row['team_name']);
        $this->assertSame($winner->seed, $row['seed']);
    }
}
