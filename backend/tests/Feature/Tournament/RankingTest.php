<?php

namespace Tests\Feature\Tournament;

use App\Models\TeamState;
use App\Models\Tournament;
use App\Models\TournamentTeam;
use App\Models\User;
use App\Modules\Tournament\Services\MatchEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RankingTest extends TestCase
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

    public function test_ranking_provisional_sorts_by_wins_then_losses_then_points(): void
    {
        $t = $this->seedTournament(4);

        // Booste les wins de deux équipes différemment.
        $states = TeamState::where('tournament_id', $t->id)->get();
        $states[0]->update(['wins' => 2, 'losses' => 0]);
        $states[1]->update(['wins' => 1, 'losses' => 1]);
        $states[2]->update(['wins' => 1, 'losses' => 2]);
        $states[3]->update(['wins' => 0, 'losses' => 1]);

        $res = $this->getJson("/api/v1/tournaments/{$t->uuid}/ranking");
        $res->assertOk()
            ->assertJsonPath('meta.final', false)
            ->assertJsonCount(4, 'data');

        $data = $res->json('data');
        $this->assertSame($states[0]->team_id, $data[0]['team']['id']); // 2W 0L
        $this->assertSame($states[1]->team_id, $data[1]['team']['id']); // 1W 1L
        $this->assertSame($states[2]->team_id, $data[2]['team']['id']); // 1W 2L
        $this->assertSame($states[3]->team_id, $data[3]['team']['id']); // 0W 1L

        $this->assertSame(1, $data[0]['position']);
        $this->assertSame(4, $data[3]['position']);
    }

    public function test_ranking_final_uses_final_position_when_completed(): void
    {
        $t = $this->seedTournament(4);
        $t->update(['status' => 'completed']);

        $states = TeamState::where('tournament_id', $t->id)->get();
        // Inverse exprès : final_position ne suit pas l'ordre de création.
        $states[0]->update(['final_position' => 3, 'wins' => 1]);
        $states[1]->update(['final_position' => 1, 'wins' => 3]);
        $states[2]->update(['final_position' => 4, 'wins' => 0]);
        $states[3]->update(['final_position' => 2, 'wins' => 2]);

        $res = $this->getJson("/api/v1/tournaments/{$t->uuid}/ranking");
        $res->assertOk()->assertJsonPath('meta.final', true);

        $data = $res->json('data');
        $this->assertSame($states[1]->team_id, $data[0]['team']['id']);
        $this->assertSame($states[3]->team_id, $data[1]['team']['id']);
        $this->assertSame($states[0]->team_id, $data[2]['team']['id']);
        $this->assertSame($states[2]->team_id, $data[3]['team']['id']);

        $this->assertSame(1, $data[0]['position']);
        $this->assertSame(1, $data[0]['final_position']);
    }
}
