<?php

namespace Tests\Feature\Tournament;

use App\Models\Tournament;
use App\Models\TournamentMatch;
use App\Models\TournamentTeam;
use App\Models\User;
use App\Modules\Tournament\Services\MatchEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamStatesTest extends TestCase
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

    public function test_team_states_public(): void
    {
        $t = $this->seedTournament(8);

        $res = $this->getJson("/api/v1/tournaments/{$t->uuid}/team-states");

        $res->assertOk()->assertJsonCount(8, 'data');
        $res->assertJsonStructure(['data' => [[
            'team' => ['id', 'team_name', 'seed', 'team_points'],
            'bloc', 'wins', 'losses', 'waiting_for_match',
            'opponents_played', 'match_history',
            'eliminated_at_round', 'final_position',
        ]]]);

        foreach ($res->json('data') as $row) {
            $this->assertSame('main', $row['bloc']);
            $this->assertSame([], $row['opponents_played']);
            $this->assertSame([], $row['match_history']);
        }
    }

    public function test_team_states_reflect_reclassify(): void
    {
        $t = $this->seedTournament(8);
        $match = TournamentMatch::where('tournament_id', $t->id)->first();
        $match->update([
            'team1_games' => 9, 'team2_games' => 6,
            'status' => 'completed',
            'winner_team_id' => $match->team1_id,
        ]);
        app(MatchEngineService::class)->reclassifyAfterMatch($match);

        $res = $this->getJson("/api/v1/tournaments/{$t->uuid}/team-states");
        $res->assertOk();

        $rows = collect($res->json('data'));
        $loser = $rows->firstWhere('team.id', $match->team2_id);
        $winner = $rows->firstWhere('team.id', $match->team1_id);

        $this->assertStringStartsWith('classement_R', $loser['bloc']);
        $this->assertSame('main', $winner['bloc']);
        $this->assertContains($match->team1_id, $loser['opponents_played']);
        $this->assertNotEmpty($winner['match_history']);
    }
}
