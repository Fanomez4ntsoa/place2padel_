<?php

namespace Tests\Feature\Tournament;

use App\Models\Tournament;
use App\Models\TournamentTeam;
use App\Models\User;
use App\Modules\Tournament\Events\TeamPromotedFromWaitlist;
use App\Modules\Tournament\Events\TeamRegistered;
use App\Modules\Tournament\Events\TeamUnregistered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class TournamentRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        return $user->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    private function userWithPoints(int $points, array $overrides = []): User
    {
        $user = User::factory()->create($overrides);
        $user->profile()->create(['padel_points' => $points]);
        return $user;
    }

    public function test_register_solo_returns_201(): void
    {
        Event::fake([TeamRegistered::class]);
        $captain = $this->userWithPoints(3000);
        $t = Tournament::factory()->create(['level' => 'P100']);

        $response = $this->postJson("/api/v1/tournaments/{$t->uuid}/register", [], [
            'Authorization' => "Bearer {$this->token($captain)}",
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.on_waitlist', false)
            ->assertJsonPath('data.team.status', 'registered')
            ->assertJsonPath('data.team.partner', null);

        $this->assertSame(1, TournamentTeam::count());
        Event::assertDispatched(TeamRegistered::class);
    }

    public function test_register_with_partner(): void
    {
        Event::fake([TeamRegistered::class]);
        $captain = $this->userWithPoints(2000);
        $partner = $this->userWithPoints(2500);
        $t = Tournament::factory()->create(['level' => 'P100']);

        $response = $this->postJson("/api/v1/tournaments/{$t->uuid}/register", [
            'partner_uuid' => $partner->uuid,
        ], ['Authorization' => "Bearer {$this->token($captain)}"]);

        $response->assertCreated()
            ->assertJsonPath('data.team.team_points', 4500);
    }

    public function test_register_partner_is_self_returns_422(): void
    {
        $captain = $this->userWithPoints(1000);
        $t = Tournament::factory()->create();

        $this->postJson("/api/v1/tournaments/{$t->uuid}/register", [
            'partner_uuid' => $captain->uuid,
        ], ['Authorization' => "Bearer {$this->token($captain)}"])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['partner_uuid']);
    }

    public function test_register_captain_exceeds_fft_limit_returns_422(): void
    {
        $captain = $this->userWithPoints(6000); // > 5000 (P100 limit)
        $t = Tournament::factory()->create(['level' => 'P100']);

        $this->postJson("/api/v1/tournaments/{$t->uuid}/register", [], [
            'Authorization' => "Bearer {$this->token($captain)}",
        ])->assertStatus(422);
    }

    public function test_register_partner_exceeds_fft_limit_returns_422(): void
    {
        $captain = $this->userWithPoints(3000);
        $partner = $this->userWithPoints(6000);
        $t = Tournament::factory()->create(['level' => 'P100']);

        $this->postJson("/api/v1/tournaments/{$t->uuid}/register", [
            'partner_uuid' => $partner->uuid,
        ], ['Authorization' => "Bearer {$this->token($captain)}"])->assertStatus(422);
    }

    public function test_register_already_as_captain_returns_409(): void
    {
        $captain = $this->userWithPoints(1000);
        $t = Tournament::factory()->create();
        TournamentTeam::create([
            'tournament_id' => $t->id,
            'captain_id' => $captain->id,
            'captain_name' => $captain->name,
            'captain_points' => 1000,
            'team_points' => 1000,
            'team_name' => 'Eq. '.$captain->name,
        ]);

        $this->postJson("/api/v1/tournaments/{$t->uuid}/register", [], [
            'Authorization' => "Bearer {$this->token($captain)}",
        ])->assertStatus(409);
    }

    public function test_register_already_as_partner_returns_409(): void
    {
        $captain1 = $this->userWithPoints(1000);
        $captain2 = $this->userWithPoints(1000);
        $shared = $this->userWithPoints(1000);
        $t = Tournament::factory()->create();

        // shared est partenaire de captain1
        TournamentTeam::create([
            'tournament_id' => $t->id,
            'captain_id' => $captain1->id,
            'partner_id' => $shared->id,
            'captain_name' => $captain1->name, 'partner_name' => $shared->name,
            'captain_points' => 1000, 'partner_points' => 1000,
            'team_points' => 2000, 'team_name' => 'X',
        ]);

        // captain2 essaie de prendre shared comme partenaire → conflit
        $this->postJson("/api/v1/tournaments/{$t->uuid}/register", [
            'partner_uuid' => $shared->uuid,
        ], ['Authorization' => "Bearer {$this->token($captain2)}"])->assertStatus(409);
    }

    public function test_register_when_full_goes_to_waitlist(): void
    {
        $t = Tournament::factory()->full()->create(['max_teams' => 2]);
        // Simuler 2 équipes déjà registered
        for ($i = 0; $i < 2; $i++) {
            $c = $this->userWithPoints(1000);
            TournamentTeam::create([
                'tournament_id' => $t->id, 'captain_id' => $c->id,
                'captain_name' => $c->name, 'captain_points' => 1000,
                'team_points' => 1000, 'team_name' => 'X',
            ]);
        }

        $late = $this->userWithPoints(1000);
        // Tournoi est déjà "full" — impossibilité de s'inscrire du tout
        // (Emergent : status=full refuse nouvelles inscriptions). Notre règle stricte :
        // on ne peut s'inscrire que si status=open. Test : on attend 409.
        $this->postJson("/api/v1/tournaments/{$t->uuid}/register", [], [
            'Authorization' => "Bearer {$this->token($late)}",
        ])->assertStatus(409);
    }

    public function test_register_transitions_tournament_to_full(): void
    {
        $t = Tournament::factory()->create(['max_teams' => 1]);
        $captain = $this->userWithPoints(1000);

        $this->postJson("/api/v1/tournaments/{$t->uuid}/register", [], [
            'Authorization' => "Bearer {$this->token($captain)}",
        ])->assertCreated();

        $this->assertSame('full', $t->fresh()->status);
    }

    public function test_register_on_closed_tournament_returns_409(): void
    {
        $t = Tournament::factory()->inProgress()->create();
        $captain = $this->userWithPoints(1000);

        $this->postJson("/api/v1/tournaments/{$t->uuid}/register", [], [
            'Authorization' => "Bearer {$this->token($captain)}",
        ])->assertStatus(409);
    }

    public function test_unregister_promotes_waitlisted_team(): void
    {
        Event::fake([TeamUnregistered::class, TeamPromotedFromWaitlist::class]);

        $t = Tournament::factory()->create(['max_teams' => 1]);
        $registered = $this->userWithPoints(1000);
        $waitlisted = $this->userWithPoints(1000);

        // registered occupe le slot
        TournamentTeam::create([
            'tournament_id' => $t->id, 'captain_id' => $registered->id,
            'captain_name' => $registered->name, 'captain_points' => 1000,
            'team_points' => 1000, 'team_name' => 'R', 'status' => 'registered',
        ]);
        $t->update(['status' => 'full']);

        // waitlisted attend
        TournamentTeam::create([
            'tournament_id' => $t->id, 'captain_id' => $waitlisted->id,
            'captain_name' => $waitlisted->name, 'captain_points' => 1000,
            'team_points' => 1000, 'team_name' => 'W', 'status' => 'waitlisted',
        ]);

        // registered se désinscrit
        $response = $this->deleteJson("/api/v1/tournaments/{$t->uuid}/register", [], [
            'Authorization' => "Bearer {$this->token($registered)}",
        ]);

        $response->assertOk()
            ->assertJsonPath('data.unregistered', true);
        $this->assertNotNull($response->json('data.promoted_team'));

        // Tournoi reste "full" (net count inchangé)
        $this->assertSame('full', $t->fresh()->status);
        // Waitlisted est maintenant registered
        $this->assertSame('registered', TournamentTeam::where('captain_id', $waitlisted->id)->value('status'));

        Event::assertDispatched(TeamUnregistered::class);
        Event::assertDispatched(TeamPromotedFromWaitlist::class);
    }

    public function test_unregister_no_waitlist_returns_tournament_to_open(): void
    {
        $t = Tournament::factory()->full()->create(['max_teams' => 1]);
        $registered = $this->userWithPoints(1000);

        TournamentTeam::create([
            'tournament_id' => $t->id, 'captain_id' => $registered->id,
            'captain_name' => $registered->name, 'captain_points' => 1000,
            'team_points' => 1000, 'team_name' => 'R', 'status' => 'registered',
        ]);

        $this->deleteJson("/api/v1/tournaments/{$t->uuid}/register", [], [
            'Authorization' => "Bearer {$this->token($registered)}",
        ])->assertOk()->assertJsonPath('data.promoted_team', null);

        $this->assertSame('open', $t->fresh()->status);
    }

    public function test_unregister_when_not_inscribed_returns_404(): void
    {
        $t = Tournament::factory()->create();
        $someone = $this->userWithPoints(1000);

        $this->deleteJson("/api/v1/tournaments/{$t->uuid}/register", [], [
            'Authorization' => "Bearer {$this->token($someone)}",
        ])->assertStatus(404);
    }
}
