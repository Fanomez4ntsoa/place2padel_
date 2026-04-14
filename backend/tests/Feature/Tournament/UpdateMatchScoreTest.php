<?php

namespace Tests\Feature\Tournament;

use App\Models\Tournament;
use App\Models\TournamentMatch;
use App\Models\TournamentTeam;
use App\Models\User;
use App\Modules\Tournament\Services\MatchEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UpdateMatchScoreTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $u): string
    {
        return $u->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    private function seedTournament(): array
    {
        $t = Tournament::factory()->create();
        $teams = [];
        for ($i = 0; $i < 4; $i++) {
            $captain = User::factory()->create();
            $partner = User::factory()->create();
            $teams[] = TournamentTeam::create([
                'tournament_id' => $t->id,
                'captain_id' => $captain->id,
                'partner_id' => $partner->id,
                'captain_name' => $captain->name,
                'partner_name' => $partner->name,
                'captain_points' => 1000 - $i,
                'partner_points' => 500,
                'team_points' => 1500 - $i,
                'team_name' => 'Eq. '.($i + 1),
                'status' => 'registered',
            ]);
        }
        app(MatchEngineService::class)->generateInitial($t);
        return [$t, $teams];
    }

    public function test_captain_of_team1_sets_score(): void
    {
        [$t, $teams] = $this->seedTournament();
        $match = TournamentMatch::where('tournament_id', $t->id)->first();
        $captain = $match->team1->captain;

        $res = $this->putJson("/api/v1/matches/{$match->uuid}/score", [
            'team1_games' => 9, 'team2_games' => 6,
        ], ['Authorization' => "Bearer {$this->token($captain)}"]);

        $res->assertOk()
            ->assertJsonPath('data.score.team1_games', 9)
            ->assertJsonPath('data.score.team2_games', 6)
            ->assertJsonPath('data.status', 'in_progress');
    }

    public function test_partner_of_team2_can_set_score(): void
    {
        [$t] = $this->seedTournament();
        $match = TournamentMatch::where('tournament_id', $t->id)->first();
        $partner = $match->team2->partner;

        $this->putJson("/api/v1/matches/{$match->uuid}/score", [
            'team1_games' => 3, 'team2_games' => 9,
        ], ['Authorization' => "Bearer {$this->token($partner)}"])
            ->assertOk();
    }

    public function test_other_user_is_forbidden(): void
    {
        [$t] = $this->seedTournament();
        $match = TournamentMatch::where('tournament_id', $t->id)->first();
        $intruder = User::factory()->create();

        $this->putJson("/api/v1/matches/{$match->uuid}/score", [
            'team1_games' => 9, 'team2_games' => 6,
        ], ['Authorization' => "Bearer {$this->token($intruder)}"])
            ->assertForbidden();
    }

    public function test_unauthenticated_is_401(): void
    {
        [$t] = $this->seedTournament();
        $match = TournamentMatch::where('tournament_id', $t->id)->first();

        $this->putJson("/api/v1/matches/{$match->uuid}/score", [
            'team1_games' => 9, 'team2_games' => 6,
        ])->assertUnauthorized();
    }

    public function test_tiebreak_required_at_8_8(): void
    {
        [$t] = $this->seedTournament();
        $match = TournamentMatch::where('tournament_id', $t->id)->first();
        $captain = $match->team1->captain;
        $headers = ['Authorization' => "Bearer {$this->token($captain)}"];

        // 8-8 sans tie-break → 422.
        $this->putJson("/api/v1/matches/{$match->uuid}/score", [
            'team1_games' => 8, 'team2_games' => 8,
        ], $headers)->assertStatus(422);

        // 8-8 + tie-break écart 1 → 422.
        $this->putJson("/api/v1/matches/{$match->uuid}/score", [
            'team1_games' => 8, 'team2_games' => 8,
            'tiebreak_team1' => 9, 'tiebreak_team2' => 8,
        ], $headers)->assertStatus(422);

        // 8-8 + tie-break 10-8 → OK.
        $this->putJson("/api/v1/matches/{$match->uuid}/score", [
            'team1_games' => 8, 'team2_games' => 8,
            'tiebreak_team1' => 10, 'tiebreak_team2' => 8,
        ], $headers)->assertOk();
    }

    public function test_tiebreak_forbidden_outside_8_8(): void
    {
        [$t] = $this->seedTournament();
        $match = TournamentMatch::where('tournament_id', $t->id)->first();
        $captain = $match->team1->captain;

        $this->putJson("/api/v1/matches/{$match->uuid}/score", [
            'team1_games' => 9, 'team2_games' => 6,
            'tiebreak_team1' => 10, 'tiebreak_team2' => 8,
        ], ['Authorization' => "Bearer {$this->token($captain)}"])
            ->assertStatus(422);
    }

    public function test_game_out_of_range(): void
    {
        [$t] = $this->seedTournament();
        $match = TournamentMatch::where('tournament_id', $t->id)->first();
        $captain = $match->team1->captain;

        $this->putJson("/api/v1/matches/{$match->uuid}/score", [
            'team1_games' => 10, 'team2_games' => 6,
        ], ['Authorization' => "Bearer {$this->token($captain)}"])
            ->assertStatus(422);
    }

    public function test_completed_match_cannot_be_updated(): void
    {
        [$t] = $this->seedTournament();
        $match = TournamentMatch::where('tournament_id', $t->id)->first();
        $match->update(['status' => 'completed']);

        $captain = $match->team1->captain;
        $this->putJson("/api/v1/matches/{$match->uuid}/score", [
            'team1_games' => 9, 'team2_games' => 6,
        ], ['Authorization' => "Bearer {$this->token($captain)}"])
            ->assertStatus(422);
    }

    public function test_resubmit_resets_validations(): void
    {
        [$t] = $this->seedTournament();
        $match = TournamentMatch::where('tournament_id', $t->id)->first();
        $match->update(['validated_by_team1' => true, 'validated_by_team2' => true, 'status' => 'in_progress']);
        $captain = $match->team1->captain;

        $this->putJson("/api/v1/matches/{$match->uuid}/score", [
            'team1_games' => 9, 'team2_games' => 7,
        ], ['Authorization' => "Bearer {$this->token($captain)}"])
            ->assertOk();

        $fresh = $match->fresh();
        $this->assertFalse($fresh->validated_by_team1);
        $this->assertFalse($fresh->validated_by_team2);
    }
}
