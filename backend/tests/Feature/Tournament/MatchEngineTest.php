<?php

namespace Tests\Feature\Tournament;

use App\Models\Pool;
use App\Models\TeamState;
use App\Models\Tournament;
use App\Models\TournamentMatch;
use App\Models\TournamentTeam;
use App\Models\User;
use App\Modules\Tournament\Events\TournamentCompleted;
use App\Modules\Tournament\Services\MatchEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class MatchEngineTest extends TestCase
{
    use RefreshDatabase;

    private MatchEngineService $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = app(MatchEngineService::class);
    }

    /**
     * Crée $count équipes avec des team_points décroissants distincts
     * (garantit un seeding déterministe : 1000, 999, 998, …).
     */
    private function createTeams(Tournament $tournament, int $count): array
    {
        $teams = [];
        for ($i = 0; $i < $count; $i++) {
            $u = User::factory()->create();
            $teams[] = TournamentTeam::create([
                'tournament_id' => $tournament->id,
                'captain_id' => $u->id,
                'captain_name' => $u->name,
                'captain_points' => 1000 - $i,
                'team_points' => 1000 - $i,
                'team_name' => 'Eq. '.($i + 1),
                'status' => 'registered',
            ]);
        }
        return $teams;
    }

    // ────────────────────────────────────────────────────────────────────
    // Format poules (4 équipes)
    // ────────────────────────────────────────────────────────────────────

    public function test_format_poules_4_teams(): void
    {
        $t = Tournament::factory()->create();
        $this->createTeams($t, 4);

        $this->engine->generateInitial($t);

        $this->assertSame('in_progress', $t->fresh()->status);
        $this->assertSame(1, Pool::where('tournament_id', $t->id)->count());
        // Round-robin 4 équipes = C(4,2) = 6 matchs.
        $this->assertSame(6, TournamentMatch::where('tournament_id', $t->id)->count());
        $this->assertSame(4, TeamState::where('tournament_id', $t->id)->count());

        foreach (TeamState::where('tournament_id', $t->id)->get() as $s) {
            $this->assertSame(0, $s->wins);
            $this->assertSame(0, $s->losses);
            $this->assertSame('main', $s->bloc);
            $this->assertTrue($s->waiting_for_match);
        }

        foreach (TournamentMatch::where('tournament_id', $t->id)->get() as $m) {
            $this->assertSame('poule', $m->phase);
            $this->assertSame('pending', $m->status);
        }
    }

    // ────────────────────────────────────────────────────────────────────
    // Format élimination directe (8 équipes, sans BYE)
    // ────────────────────────────────────────────────────────────────────

    public function test_format_elimination_8_teams_no_bye(): void
    {
        $t = Tournament::factory()->create();
        $teams = $this->createTeams($t, 8);

        $this->engine->generateInitial($t);

        // 8 équipes → bracket_size=8, 4 matchs R1, 0 BYE.
        $matches = TournamentMatch::where('tournament_id', $t->id)->get();
        $this->assertCount(4, $matches);
        $this->assertSame(0, Pool::where('tournament_id', $t->id)->count());

        foreach ($matches as $m) {
            $this->assertSame('bracket', $m->phase);
            $this->assertSame('main', $m->bloc);
            $this->assertSame(3, $m->round); // log2(8) = 3
        }

        $this->assertSame(8, TeamState::where('tournament_id', $t->id)->count());

        // Seeds 1..8 persistés.
        $seeds = TournamentTeam::where('tournament_id', $t->id)->orderBy('seed')->pluck('seed')->all();
        $this->assertSame([1, 2, 3, 4, 5, 6, 7, 8], $seeds);

        // Aucune équipe n'a wins=1 (pas de BYE).
        $this->assertSame(0, TeamState::where('tournament_id', $t->id)->where('wins', '>', 0)->count());
    }

    // ────────────────────────────────────────────────────────────────────
    // Format élimination avec BYE (5 équipes → bracket 8, 3 BYEs)
    // ────────────────────────────────────────────────────────────────────

    public function test_format_elimination_5_teams_with_byes(): void
    {
        // recommendFormat(5) = poules_classement par défaut. On force 8 pour bracket.
        // Réécriture : 5 équipes via 13 pour entrer dans la branche elimination_directe.
        // En fait le plus propre est de tester via generateBracket directement avec reflection.
        $t = Tournament::factory()->create();
        $teams = $this->createTeams($t, 13); // 13 → elimination_directe, bracket 16, 3 BYEs

        $this->engine->generateInitial($t);

        // bracket_size = 16, num_rounds = 4. 13 équipes → 3 BYEs (slots vides 13,14,15).
        // Matchs R1 : paires (0,1)(2,3)(4,5)(6,7)(8,9)(10,11)(12,13)(14,15)
        // Avec 13 équipes, positions occupées 0..12 via seedPositions(16)=[0,8,4,12,2,10,6,14,1,9,5,13,3,11,7,15].
        // Les 13 premières positions dans positions[] : [0,8,4,12,2,10,6,14,1,9,5,13,3]. Slots non occupés : 7, 11, 15.
        // Paires R1 : (0,1)✓ (2,3)✓ (4,5)✓ (6,7)✗ (8,9)✓ (10,11)✗ (12,13)✓ (14,15)✗
        // → 5 matchs créés, 3 BYEs (positions 0, 2, 8 qui sont seuls dans leur paire (1,3,9 pair dégueu)).
        // Plus simplement : 13 équipes, 16 slots, 3 BYEs → (16-13)=3 slots vides, 3 équipes passent en BYE.

        $matches = TournamentMatch::where('tournament_id', $t->id)->get();
        $byeStates = TeamState::where('tournament_id', $t->id)->where('wins', 1)->get();

        $this->assertSame(13, TeamState::where('tournament_id', $t->id)->count());
        $this->assertCount(3, $byeStates); // 3 équipes avec wins=1 suite au BYE
        $this->assertCount(5, $matches); // 16/2 = 8 paires potentielles, 3 BYEs → 5 matchs

        foreach ($byeStates as $s) {
            $this->assertNotEmpty($s->match_history);
            $this->assertSame('bye', $s->match_history[0]['result']);
        }
    }

    // ────────────────────────────────────────────────────────────────────
    // Format poules_classement (9 équipes)
    // ────────────────────────────────────────────────────────────────────

    public function test_format_poules_classement_9_teams(): void
    {
        $t = Tournament::factory()->create();
        $this->createTeams($t, 9);

        $this->engine->generateInitial($t);

        // 9 → 3 poules de 3. Round-robin par poule = C(3,2) = 3 matchs. Total = 9.
        $this->assertSame(3, Pool::where('tournament_id', $t->id)->count());
        $this->assertSame(9, TournamentMatch::where('tournament_id', $t->id)->count());

        // Distribution serpentin 9/3 : A=[1,6,7], B=[2,5,8], C=[3,4,9].
        $pools = Pool::where('tournament_id', $t->id)->orderBy('pool_name')->get();
        $seedsById = TournamentTeam::where('tournament_id', $t->id)->pluck('seed', 'id')->all();

        $poolSeeds = [];
        foreach ($pools as $pool) {
            $poolSeeds[$pool->pool_name] = array_map(fn ($id) => $seedsById[$id], $pool->team_ids);
        }
        $this->assertSame([1, 6, 7], $poolSeeds['Poule A']);
        $this->assertSame([2, 5, 8], $poolSeeds['Poule B']);
        $this->assertSame([3, 4, 9], $poolSeeds['Poule C']);
    }

    // ────────────────────────────────────────────────────────────────────
    // Reclassement dynamique — winner reste main, loser → classement_R{n}
    // ────────────────────────────────────────────────────────────────────

    public function test_reclassify_moves_loser_to_classement_bloc(): void
    {
        $t = Tournament::factory()->create();
        $teams = $this->createTeams($t, 8);
        $this->engine->generateInitial($t);

        $match = TournamentMatch::where('tournament_id', $t->id)->orderBy('match_number')->first();
        $match->team1_games = 9;
        $match->team2_games = 6;
        $match->status = 'completed';
        $match->winner_team_id = $match->team1_id;
        $match->validated_by_team1 = true;
        $match->validated_by_team2 = true;
        $match->save();

        $this->engine->reclassifyAfterMatch($match);

        $winner = TeamState::where('tournament_id', $t->id)->where('team_id', $match->team1_id)->first();
        $loser = TeamState::where('tournament_id', $t->id)->where('team_id', $match->team2_id)->first();

        $this->assertSame('main', $winner->bloc);
        $this->assertSame(1, $winner->wins);
        $this->assertSame("classement_R{$match->round}", $loser->bloc);
        $this->assertSame($match->round, $loser->eliminated_at_round);
        $this->assertSame(1, $loser->losses);
        $this->assertContains($match->team2_id, $winner->opponents_played);
        $this->assertContains($match->team1_id, $loser->opponents_played);
    }

    public function test_reclassify_is_idempotent(): void
    {
        $t = Tournament::factory()->create();
        $this->createTeams($t, 8);
        $this->engine->generateInitial($t);

        $match = TournamentMatch::where('tournament_id', $t->id)->first();
        $match->team1_games = 9;
        $match->team2_games = 6;
        $match->status = 'completed';
        $match->winner_team_id = $match->team1_id;
        $match->save();

        $this->engine->reclassifyAfterMatch($match);
        $this->engine->reclassifyAfterMatch($match); // rejeu : no-op.

        $winner = TeamState::where('tournament_id', $t->id)->where('team_id', $match->team1_id)->first();
        $loser = TeamState::where('tournament_id', $t->id)->where('team_id', $match->team2_id)->first();

        $this->assertSame(1, $winner->wins); // pas 2.
        $this->assertSame(1, $loser->losses);
        $this->assertCount(1, $winner->match_history);
        $this->assertCount(1, $loser->opponents_played);
    }

    // ────────────────────────────────────────────────────────────────────
    // Anti-rematch — 2 équipes déjà affrontées ne sont pas réappariées
    // ────────────────────────────────────────────────────────────────────

    public function test_anti_rematch_prevents_pairing_same_teams(): void
    {
        $t = Tournament::factory()->create();
        $teams = $this->createTeams($t, 4);

        // Init manuel : 4 équipes toutes dans le même bloc 'classement_R3',
        // les 2 premières se sont déjà affrontées (opponents_played croisé).
        foreach ($teams as $team) {
            TeamState::create([
                'tournament_id' => $t->id,
                'team_id' => $team->id,
                'wins' => 0,
                'losses' => 0,
                'bloc' => 'classement_R3',
                'waiting_for_match' => true,
                'opponents_played' => [],
                'match_history' => [],
            ]);
        }
        TeamState::where('team_id', $teams[0]->id)->update(['opponents_played' => [$teams[1]->id]]);
        TeamState::where('team_id', $teams[1]->id)->update(['opponents_played' => [$teams[0]->id]]);

        $this->engine->generateDynamicMatches($t);

        $matches = TournamentMatch::where('tournament_id', $t->id)->get();
        // 4 équipes dans le même bloc dont 2 avec historique croisé → appariement
        // possible sans rematch : (t0-t2) et (t1-t3) par exemple. On vérifie simplement
        // qu'aucun match ne recrée la paire t0/t1.
        foreach ($matches as $m) {
            $pair = [$m->team1_id, $m->team2_id];
            sort($pair);
            $this->assertNotEquals([$teams[0]->id, $teams[1]->id], $pair);
        }
    }

    // ────────────────────────────────────────────────────────────────────
    // Finalisation — plus aucun match possible → final_position + event
    // ────────────────────────────────────────────────────────────────────

    public function test_finalization_assigns_positions_and_dispatches_event(): void
    {
        Event::fake([TournamentCompleted::class]);

        $t = Tournament::factory()->create();
        $teams = $this->createTeams($t, 2);

        // Init team_states manuellement (2 équipes, même bloc).
        foreach ($teams as $team) {
            TeamState::create([
                'tournament_id' => $t->id,
                'team_id' => $team->id,
                'wins' => 0,
                'losses' => 0,
                'bloc' => 'main',
                'waiting_for_match' => true,
                'opponents_played' => [],
                'match_history' => [],
            ]);
        }

        // Match complété, reclassif : loser → classement_R3, winner reste main.
        // Après reclassif, chaque équipe seule dans son bloc → aucun nouveau match possible.
        $match = TournamentMatch::create([
            'tournament_id' => $t->id,
            'pool_id' => null,
            'phase' => 'bracket',
            'bloc' => 'main',
            'round' => 3,
            'match_number' => 1,
            'team1_id' => $teams[0]->id,
            'team2_id' => $teams[1]->id,
            'team1_games' => 9,
            'team2_games' => 6,
            'status' => 'completed',
            'winner_team_id' => $teams[0]->id,
        ]);

        $this->engine->reclassifyAfterMatch($match);

        $states = TeamState::where('tournament_id', $t->id)->get();
        foreach ($states as $s) {
            $this->assertNotNull($s->final_position, "team {$s->team_id} sans final_position");
        }
        $this->assertSame('completed', $t->fresh()->status);
        Event::assertDispatched(TournamentCompleted::class);
    }
}
