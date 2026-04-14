<?php

namespace Tests\Feature\Notification;

use App\Models\ClubSubscription;
use App\Models\Notification;
use App\Models\Tournament;
use App\Models\TournamentTeam;
use App\Models\User;
use App\Modules\Notification\Listeners\NotifyTeamRegistered;
use App\Modules\Tournament\Events\TeamRegistered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Queue=sync + MAIL_MAILER=array en env test → on laisse la chaîne complète
 * s'exécuter (FanoutJob → Notification rows). L'anti-dup dépend de la présence
 * réelle de ces rows, donc faker Bus/Queue désactiverait la protection qu'on
 * veut justement tester.
 */
class MilestoneTest extends TestCase
{
    use RefreshDatabase;

    private Tournament $tournament;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tournament = Tournament::factory()->create(['max_teams' => 10]);
        User::factory()->count(5)->create()->each(function ($u) {
            ClubSubscription::create(['user_id' => $u->id, 'club_id' => $this->tournament->club_id]);
        });
    }

    private function registerTeams(int $count): void
    {
        for ($i = 0; $i < $count; $i++) {
            $captain = User::factory()->create();
            $team = TournamentTeam::create([
                'tournament_id' => $this->tournament->id,
                'captain_id' => $captain->id,
                'captain_name' => $captain->name,
                'captain_points' => 1000,
                'team_points' => 1000,
                'team_name' => 'Eq. '.($i + 1),
                'status' => 'registered',
            ]);
            app(NotifyTeamRegistered::class)->handle(new TeamRegistered($team));
        }
    }

    private function milestoneNotifs(string $type): int
    {
        return Notification::where('type', $type)
            ->whereJsonContains('data->tournament_uuid', $this->tournament->uuid)
            ->count();
    }

    public function test_50_percent_fires_once_for_5_subscribers(): void
    {
        $this->registerTeams(5); // 50%

        // 5 abonnés → 5 notifications milestone_50.
        $this->assertSame(5, $this->milestoneNotifs('milestone_50'));
        $this->assertSame(0, $this->milestoneNotifs('milestone_90'));
    }

    public function test_90_percent_fires_milestone_90(): void
    {
        $this->registerTeams(9);

        $this->assertSame(5, $this->milestoneNotifs('milestone_50'));
        $this->assertSame(5, $this->milestoneNotifs('milestone_90'));
        $this->assertSame(0, $this->milestoneNotifs('tournament_full'));
    }

    public function test_100_percent_fires_tournament_full(): void
    {
        $this->registerTeams(10);

        $this->assertSame(5, $this->milestoneNotifs('milestone_50'));
        $this->assertSame(5, $this->milestoneNotifs('milestone_90'));
        $this->assertSame(5, $this->milestoneNotifs('tournament_full'));
    }

    public function test_milestone_not_duplicated_on_reprocessing(): void
    {
        $this->registerTeams(5); // 5 notifs milestone_50 émises.
        $this->assertSame(5, $this->milestoneNotifs('milestone_50'));

        // Re-déclenche le listener sur la dernière équipe : anti-dup via whereJsonContains.
        $lastTeam = $this->tournament->teams()->latest('id')->first();
        app(NotifyTeamRegistered::class)->handle(new TeamRegistered($lastTeam));

        // Toujours 5 — pas de doublon malgré le rejeu.
        $this->assertSame(5, $this->milestoneNotifs('milestone_50'));
    }
}
