<?php

namespace Tests\Feature\Tournament;

use App\Models\TeamState;
use App\Models\Tournament;
use App\Models\TournamentMatch;
use App\Models\TournamentTeam;
use App\Models\User;
use App\Modules\Tournament\Services\MatchEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ValidateMatchTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $u): string
    {
        return $u->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    /** @return array{0:Tournament, 1:TournamentMatch} */
    private function seedMatch(int $teams = 8): array
    {
        $t = Tournament::factory()->create();
        for ($i = 0; $i < $teams; $i++) {
            $captain = User::factory()->create();
            $partner = User::factory()->create();
            TournamentTeam::create([
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

        $match = TournamentMatch::where('tournament_id', $t->id)->first();
        $match->update([
            'team1_games' => 9, 'team2_games' => 6,
            'status' => 'in_progress',
        ]);

        return [$t, $match->fresh(['team1', 'team2'])];
    }

    public function test_single_validation_does_not_complete(): void
    {
        [, $match] = $this->seedMatch();
        $captain = $match->team1->captain;

        $this->putJson("/api/v1/matches/{$match->uuid}/validate", ['team' => 'team1'], [
            'Authorization' => "Bearer {$this->token($captain)}",
        ])->assertOk();

        $fresh = $match->fresh();
        $this->assertTrue($fresh->validated_by_team1);
        $this->assertFalse($fresh->validated_by_team2);
        $this->assertSame('in_progress', $fresh->status);
        $this->assertNull($fresh->winner_team_id);
    }

    public function test_both_validations_complete_and_trigger_reclassify(): void
    {
        [$t, $match] = $this->seedMatch();
        $c1 = $match->team1->captain;
        $c2 = $match->team2->captain;

        $this->putJson("/api/v1/matches/{$match->uuid}/validate", ['team' => 'team1'], [
            'Authorization' => "Bearer {$this->token($c1)}",
        ])->assertOk();

        $this->putJson("/api/v1/matches/{$match->uuid}/validate", ['team' => 'team2'], [
            'Authorization' => "Bearer {$this->token($c2)}",
        ])->assertOk();

        $fresh = $match->fresh();
        $this->assertSame('completed', $fresh->status);
        $this->assertSame($match->team1_id, $fresh->winner_team_id);

        // Reclassement : loser → classement_R{round}, winner stays main.
        $loserState = TeamState::where('tournament_id', $t->id)
            ->where('team_id', $match->team2_id)->first();
        $this->assertStringStartsWith('classement_R', $loserState->bloc);
    }

    public function test_captain_cannot_validate_other_team(): void
    {
        [, $match] = $this->seedMatch();
        $c1 = $match->team1->captain;

        $this->putJson("/api/v1/matches/{$match->uuid}/validate", ['team' => 'team2'], [
            'Authorization' => "Bearer {$this->token($c1)}",
        ])->assertForbidden();
    }

    public function test_partner_cannot_validate(): void
    {
        [, $match] = $this->seedMatch();
        $partner = $match->team1->partner;

        $this->putJson("/api/v1/matches/{$match->uuid}/validate", ['team' => 'team1'], [
            'Authorization' => "Bearer {$this->token($partner)}",
        ])->assertForbidden();
    }

    public function test_unauthenticated_is_401(): void
    {
        [, $match] = $this->seedMatch();

        $this->putJson("/api/v1/matches/{$match->uuid}/validate", ['team' => 'team1'])
            ->assertUnauthorized();
    }

    public function test_tiebreak_determines_winner(): void
    {
        [, $match] = $this->seedMatch();
        $match->update([
            'team1_games' => 8, 'team2_games' => 8,
            'tiebreak_team1' => 8, 'tiebreak_team2' => 10,
        ]);
        $c1 = $match->team1->captain;
        $c2 = $match->team2->captain;

        $this->putJson("/api/v1/matches/{$match->uuid}/validate", ['team' => 'team1'], [
            'Authorization' => "Bearer {$this->token($c1)}",
        ])->assertOk();
        $this->putJson("/api/v1/matches/{$match->uuid}/validate", ['team' => 'team2'], [
            'Authorization' => "Bearer {$this->token($c2)}",
        ])->assertOk();

        $this->assertSame($match->team2_id, $match->fresh()->winner_team_id);
    }

    public function test_cannot_validate_without_score(): void
    {
        [, $match] = $this->seedMatch();
        $match->update(['team1_games' => null, 'team2_games' => null]);
        $c1 = $match->team1->captain;

        $this->putJson("/api/v1/matches/{$match->uuid}/validate", ['team' => 'team1'], [
            'Authorization' => "Bearer {$this->token($c1)}",
        ])->assertStatus(422);
    }

    public function test_cannot_validate_completed_match(): void
    {
        [, $match] = $this->seedMatch();
        $match->update(['status' => 'completed']);
        $c1 = $match->team1->captain;

        $this->putJson("/api/v1/matches/{$match->uuid}/validate", ['team' => 'team1'], [
            'Authorization' => "Bearer {$this->token($c1)}",
        ])->assertStatus(422);
    }
}
