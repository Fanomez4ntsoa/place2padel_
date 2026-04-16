<?php

namespace Tests\Feature\Tournament;

use App\Models\Tournament;
use App\Models\TournamentTeam;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MyTournamentsTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $u): string
    {
        return $u->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    private function headers(User $u): array
    {
        return ['Authorization' => "Bearer {$this->token($u)}"];
    }

    private function registerCaptain(Tournament $t, User $captain): TournamentTeam
    {
        return TournamentTeam::create([
            'tournament_id' => $t->id,
            'captain_id' => $captain->id,
            'captain_name' => $captain->name,
            'team_name' => 'Eq. '.$captain->name,
            'status' => 'registered',
        ]);
    }

    public function test_returns_tournaments_where_viewer_is_creator(): void
    {
        $me = User::factory()->create();
        $mine = Tournament::factory()->create(['created_by_user_id' => $me->id, 'status' => 'open']);
        Tournament::factory()->create(['status' => 'open']); // noise

        $res = $this->getJson('/api/v1/tournaments/mine', $this->headers($me));

        $res->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($mine->uuid, $res->json('data.0.uuid'));
    }

    public function test_returns_tournaments_where_viewer_is_team_captain(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $t = Tournament::factory()->create(['created_by_user_id' => $other->id, 'status' => 'open']);
        $this->registerCaptain($t, $me);
        Tournament::factory()->create(['status' => 'open']); // noise

        $res = $this->getJson('/api/v1/tournaments/mine', $this->headers($me));

        $res->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($t->uuid, $res->json('data.0.uuid'));
    }

    public function test_returns_tournaments_where_viewer_is_partner(): void
    {
        $me = User::factory()->create();
        $captain = User::factory()->create();
        $t = Tournament::factory()->create(['status' => 'open']);
        TournamentTeam::create([
            'tournament_id' => $t->id,
            'captain_id' => $captain->id,
            'partner_id' => $me->id,
            'captain_name' => $captain->name,
            'partner_name' => $me->name,
            'team_name' => 'Eq.',
            'status' => 'registered',
        ]);

        $res = $this->getJson('/api/v1/tournaments/mine', $this->headers($me));
        $res->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($t->uuid, $res->json('data.0.uuid'));
    }

    public function test_filter_status_in_progress(): void
    {
        $me = User::factory()->create();
        $live = Tournament::factory()->create(['created_by_user_id' => $me->id, 'status' => 'in_progress']);
        Tournament::factory()->create(['created_by_user_id' => $me->id, 'status' => 'open']); // filtered out

        $res = $this->getJson('/api/v1/tournaments/mine?status=in_progress', $this->headers($me));
        $res->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($live->uuid, $res->json('data.0.uuid'));
    }

    public function test_filter_status_upcoming_includes_open_and_full(): void
    {
        $me = User::factory()->create();
        $open = Tournament::factory()->create(['created_by_user_id' => $me->id, 'status' => 'open']);
        $full = Tournament::factory()->create(['created_by_user_id' => $me->id, 'status' => 'full']);
        Tournament::factory()->create(['created_by_user_id' => $me->id, 'status' => 'completed']); // filtered out

        $res = $this->getJson('/api/v1/tournaments/mine?status=upcoming', $this->headers($me));
        $res->assertOk()->assertJsonCount(2, 'data');
        $uuids = array_column($res->json('data'), 'uuid');
        $this->assertContains($open->uuid, $uuids);
        $this->assertContains($full->uuid, $uuids);
    }

    public function test_filter_status_completed(): void
    {
        $me = User::factory()->create();
        $done = Tournament::factory()->create(['created_by_user_id' => $me->id, 'status' => 'completed']);
        Tournament::factory()->create(['created_by_user_id' => $me->id, 'status' => 'open']); // filtered out

        $res = $this->getJson('/api/v1/tournaments/mine?status=completed', $this->headers($me));
        $res->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($done->uuid, $res->json('data.0.uuid'));
    }

    public function test_invalid_status_returns_422(): void
    {
        $me = User::factory()->create();
        $this->getJson('/api/v1/tournaments/mine?status=bidon', $this->headers($me))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_no_auth_returns_401(): void
    {
        $this->getJson('/api/v1/tournaments/mine')->assertStatus(401);
    }

    public function test_no_tournaments_returns_empty_data(): void
    {
        $me = User::factory()->create();
        Tournament::factory()->count(3)->create(); // not mine

        $this->getJson('/api/v1/tournaments/mine', $this->headers($me))
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }
}
