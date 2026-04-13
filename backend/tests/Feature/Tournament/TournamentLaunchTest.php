<?php

namespace Tests\Feature\Tournament;

use App\Models\Tournament;
use App\Models\TournamentTeam;
use App\Models\User;
use App\Modules\Tournament\Events\TournamentLaunched;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class TournamentLaunchTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        return $user->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    private function withTeams(Tournament $t, int $count): void
    {
        for ($i = 0; $i < $count; $i++) {
            $u = User::factory()->create();
            TournamentTeam::create([
                'tournament_id' => $t->id,
                'captain_id' => $u->id,
                'captain_name' => $u->name,
                'captain_points' => 1000,
                'team_points' => 1000,
                'team_name' => 'Eq. '.$u->name,
                'status' => 'registered',
            ]);
        }
    }

    public function test_owner_with_2_teams_launches(): void
    {
        Event::fake([TournamentLaunched::class]);
        $owner = User::factory()->create();
        $t = Tournament::factory()->create(['created_by_user_id' => $owner->id]);
        $this->withTeams($t, 2);

        $response = $this->postJson("/api/v1/tournaments/{$t->uuid}/launch", [], [
            'Authorization' => "Bearer {$this->token($owner)}",
        ]);

        $response->assertOk()->assertJsonPath('data.status', 'in_progress');

        $fresh = $t->fresh();
        $this->assertSame('in_progress', $fresh->status);
        $this->assertNotNull($fresh->launched_at);

        Event::assertDispatched(TournamentLaunched::class);
    }

    public function test_owner_with_1_team_returns_422(): void
    {
        $owner = User::factory()->create();
        $t = Tournament::factory()->create(['created_by_user_id' => $owner->id]);
        $this->withTeams($t, 1);

        $this->postJson("/api/v1/tournaments/{$t->uuid}/launch", [], [
            'Authorization' => "Bearer {$this->token($owner)}",
        ])->assertStatus(422);
    }

    public function test_non_owner_returns_403(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $t = Tournament::factory()->create(['created_by_user_id' => $owner->id]);
        $this->withTeams($t, 2);

        $this->postJson("/api/v1/tournaments/{$t->uuid}/launch", [], [
            'Authorization' => "Bearer {$this->token($other)}",
        ])->assertStatus(403);
    }

    public function test_admin_can_launch_any_tournament(): void
    {
        Event::fake([TournamentLaunched::class]);
        $admin = User::factory()->admin()->create();
        $t = Tournament::factory()->create();
        $this->withTeams($t, 2);

        $this->postJson("/api/v1/tournaments/{$t->uuid}/launch", [], [
            'Authorization' => "Bearer {$this->token($admin)}",
        ])->assertOk();

        Event::assertDispatched(TournamentLaunched::class);
    }

    public function test_already_in_progress_returns_403(): void
    {
        $owner = User::factory()->create();
        $t = Tournament::factory()->inProgress()->create(['created_by_user_id' => $owner->id]);
        $this->withTeams($t, 2);

        $this->postJson("/api/v1/tournaments/{$t->uuid}/launch", [], [
            'Authorization' => "Bearer {$this->token($owner)}",
        ])->assertStatus(403);
    }
}
