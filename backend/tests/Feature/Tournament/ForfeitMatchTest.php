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

class ForfeitMatchTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $u): string
    {
        return $u->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    /** @return array{0:Tournament, 1:TournamentMatch, 2:User} */
    private function seedMatch(): array
    {
        $owner = User::factory()->create();
        $t = Tournament::factory()->create(['created_by_user_id' => $owner->id]);
        for ($i = 0; $i < 8; $i++) {
            $captain = User::factory()->create();
            TournamentTeam::create([
                'tournament_id' => $t->id,
                'captain_id' => $captain->id,
                'captain_name' => $captain->name,
                'captain_points' => 1000 - $i,
                'team_points' => 1000 - $i,
                'team_name' => 'Eq. '.($i + 1),
                'status' => 'registered',
            ]);
        }
        app(MatchEngineService::class)->generateInitial($t);

        $match = TournamentMatch::where('tournament_id', $t->id)->first();
        return [$t, $match->fresh(['team1', 'team2']), $owner];
    }

    public function test_owner_forfeits_team1(): void
    {
        [$t, $match, $owner] = $this->seedMatch();

        $res = $this->postJson("/api/v1/matches/{$match->uuid}/forfeit", [
            'forfeiting_team' => 'team1',
        ], ['Authorization' => "Bearer {$this->token($owner)}"]);

        $res->assertOk();
        $fresh = $match->fresh();
        $this->assertSame('forfeit', $fresh->status);
        $this->assertSame(0, $fresh->team1_games);
        $this->assertSame(9, $fresh->team2_games);
        $this->assertSame($match->team2_id, $fresh->winner_team_id);

        // Reclassement déclenché : loser → classement_R{round}.
        $loserState = TeamState::where('tournament_id', $t->id)
            ->where('team_id', $match->team1_id)->first();
        $this->assertStringStartsWith('classement_R', $loserState->bloc);
    }

    public function test_admin_can_forfeit(): void
    {
        [, $match] = $this->seedMatch();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->postJson("/api/v1/matches/{$match->uuid}/forfeit", [
            'forfeiting_team' => 'team2',
        ], ['Authorization' => "Bearer {$this->token($admin)}"])
            ->assertOk();

        $fresh = $match->fresh();
        $this->assertSame($match->team1_id, $fresh->winner_team_id);
    }

    public function test_non_owner_forbidden(): void
    {
        [, $match] = $this->seedMatch();
        $intruder = User::factory()->create();

        $this->postJson("/api/v1/matches/{$match->uuid}/forfeit", [
            'forfeiting_team' => 'team1',
        ], ['Authorization' => "Bearer {$this->token($intruder)}"])
            ->assertForbidden();
    }

    public function test_captain_of_team_cannot_forfeit(): void
    {
        [, $match] = $this->seedMatch();
        $captain = $match->team1->captain;

        $this->postJson("/api/v1/matches/{$match->uuid}/forfeit", [
            'forfeiting_team' => 'team1',
        ], ['Authorization' => "Bearer {$this->token($captain)}"])
            ->assertForbidden();
    }

    public function test_unauthenticated_is_401(): void
    {
        [, $match] = $this->seedMatch();

        $this->postJson("/api/v1/matches/{$match->uuid}/forfeit", [
            'forfeiting_team' => 'team1',
        ])->assertUnauthorized();
    }

    public function test_already_completed_returns_422(): void
    {
        [, $match, $owner] = $this->seedMatch();
        $match->update(['status' => 'completed']);

        $this->postJson("/api/v1/matches/{$match->uuid}/forfeit", [
            'forfeiting_team' => 'team1',
        ], ['Authorization' => "Bearer {$this->token($owner)}"])
            ->assertStatus(422);
    }

    public function test_invalid_side_returns_422(): void
    {
        [, $match, $owner] = $this->seedMatch();

        $this->postJson("/api/v1/matches/{$match->uuid}/forfeit", [
            'forfeiting_team' => 'bogus',
        ], ['Authorization' => "Bearer {$this->token($owner)}"])
            ->assertStatus(422);
    }
}
