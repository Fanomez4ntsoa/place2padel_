<?php

namespace Tests\Feature\Matchmaking;

use App\Models\Tournament;
use App\Models\TournamentInterest;
use App\Models\TournamentTeam;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeekingPartnerTest extends TestCase
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

    private function makeSeeker(): User
    {
        $u = User::factory()->create();
        UserProfile::create(['user_id' => $u->id, 'position' => 'both', 'padel_points' => 1000]);
        return $u;
    }

    public function test_declare_seeking_201(): void
    {
        $t = Tournament::factory()->create();
        $u = $this->makeSeeker();

        $this->postJson("/api/v1/tournaments/{$t->uuid}/seeking-partner", ['message' => 'Gaucher P500'], $this->headers($u))
            ->assertStatus(201);

        $this->assertDatabaseHas('tournament_interests', [
            'tournament_id' => $t->id, 'user_id' => $u->id, 'message' => 'Gaucher P500',
        ]);
    }

    public function test_redeclare_is_idempotent(): void
    {
        $t = Tournament::factory()->create();
        $u = $this->makeSeeker();

        $this->postJson("/api/v1/tournaments/{$t->uuid}/seeking-partner", ['message' => 'v1'], $this->headers($u))
            ->assertStatus(201);
        $this->postJson("/api/v1/tournaments/{$t->uuid}/seeking-partner", ['message' => 'v2'], $this->headers($u))
            ->assertStatus(201);

        $this->assertSame(1, TournamentInterest::count());
        $this->assertDatabaseHas('tournament_interests', ['user_id' => $u->id, 'message' => 'v2']);
    }

    public function test_cancel_seeking(): void
    {
        $t = Tournament::factory()->create();
        $u = $this->makeSeeker();
        TournamentInterest::create(['tournament_id' => $t->id, 'user_id' => $u->id]);

        $this->deleteJson("/api/v1/tournaments/{$t->uuid}/seeking-partner", [], $this->headers($u))
            ->assertOk()->assertJsonPath('deleted', true);

        $this->assertSame(0, TournamentInterest::count());
    }

    public function test_list_authenticated_exposes_scores(): void
    {
        $t = Tournament::factory()->create();
        $viewer = $this->makeSeeker();
        $seeker = $this->makeSeeker();
        TournamentInterest::create(['tournament_id' => $t->id, 'user_id' => $seeker->id]);

        $res = $this->getJson("/api/v1/tournaments/{$t->uuid}/seeking-partners", $this->headers($viewer));
        $res->assertOk()->assertJsonPath('meta.authenticated', true);
        $this->assertArrayHasKey('compatibility_score', $res->json('data.0'));
    }

    public function test_list_public_count_only(): void
    {
        $t = Tournament::factory()->create();
        $seeker = $this->makeSeeker();
        TournamentInterest::create(['tournament_id' => $t->id, 'user_id' => $seeker->id]);

        $res = $this->getJson("/api/v1/tournaments/{$t->uuid}/seeking-partners");
        $res->assertOk()
            ->assertJsonPath('meta.authenticated', false)
            ->assertJsonPath('meta.count', 1)
            ->assertJsonCount(0, 'data');
    }

    public function test_declare_blocked_if_already_in_team(): void
    {
        $t = Tournament::factory()->create();
        $u = $this->makeSeeker();
        TournamentTeam::create([
            'tournament_id' => $t->id,
            'captain_id' => $u->id,
            'captain_name' => $u->name,
            'captain_points' => 1000,
            'team_points' => 1000,
            'team_name' => 'Eq. '.$u->name,
            'status' => 'registered',
        ]);

        $this->postJson("/api/v1/tournaments/{$t->uuid}/seeking-partner", [], $this->headers($u))
            ->assertStatus(422);
    }

    public function test_list_excludes_already_registered(): void
    {
        $t = Tournament::factory()->create();
        $viewer = $this->makeSeeker();

        $registered = $this->makeSeeker();
        TournamentTeam::create([
            'tournament_id' => $t->id,
            'captain_id' => $registered->id,
            'captain_name' => $registered->name,
            'captain_points' => 1000,
            'team_points' => 1000,
            'team_name' => 'Eq. '.$registered->name,
            'status' => 'registered',
        ]);
        // Edge : registered user qui aurait aussi déclaré par erreur → doit être exclu.
        TournamentInterest::create(['tournament_id' => $t->id, 'user_id' => $registered->id]);

        $seeker = $this->makeSeeker();
        TournamentInterest::create(['tournament_id' => $t->id, 'user_id' => $seeker->id]);

        $res = $this->getJson("/api/v1/tournaments/{$t->uuid}/seeking-partners", $this->headers($viewer));
        $res->assertOk();
        $data = $res->json('data');
        $this->assertCount(1, $data);
        $this->assertSame($seeker->uuid, $data[0]['user']['uuid']);
    }
}
