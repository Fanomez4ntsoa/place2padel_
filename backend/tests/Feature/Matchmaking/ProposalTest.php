<?php

namespace Tests\Feature\Matchmaking;

use App\Models\Conversation;
use App\Models\PrivateMessage;
use App\Models\Proposal;
use App\Models\Tournament;
use App\Models\TournamentInterest;
use App\Models\User;
use App\Modules\Matchmaking\Events\ProposalCreated;
use App\Modules\Matchmaking\Events\ProposalResponded;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ProposalTest extends TestCase
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

    private function seedSeeking(): array
    {
        $t = Tournament::factory()->create();
        $from = User::factory()->create();
        $to = User::factory()->create();
        TournamentInterest::create(['tournament_id' => $t->id, 'user_id' => $to->id]);
        return [$t, $from, $to];
    }

    public function test_create_proposal_creates_conversation_and_system_message(): void
    {
        Event::fake([ProposalCreated::class]);
        [$t, $from, $to] = $this->seedSeeking();

        $this->postJson("/api/v1/tournaments/{$t->uuid}/propose-to-partner", [
            'target_user_uuid' => $to->uuid,
        ], $this->headers($from))->assertSuccessful();

        $this->assertSame(1, Proposal::count());
        $this->assertSame(1, Conversation::count());
        $this->assertSame(1, PrivateMessage::where('type', 'tournament_proposal')->count());
        Event::assertDispatched(ProposalCreated::class);
    }

    public function test_proposal_blocked_if_target_not_seeking(): void
    {
        $t = Tournament::factory()->create();
        $from = User::factory()->create();
        $to = User::factory()->create(); // pas de interest.

        $this->postJson("/api/v1/tournaments/{$t->uuid}/propose-to-partner", [
            'target_user_uuid' => $to->uuid,
        ], $this->headers($from))->assertStatus(422);
    }

    public function test_anti_spam_blocks_4th_pending(): void
    {
        [$t, $from, $to] = $this->seedSeeking();
        for ($i = 0; $i < 3; $i++) {
            Proposal::create([
                'type' => 'tournament_partner',
                'from_user_id' => $from->id,
                'to_user_id' => $to->id,
                'tournament_id' => $t->id,
                'status' => 'pending',
            ]);
        }

        $this->postJson("/api/v1/tournaments/{$t->uuid}/propose-to-partner", [
            'target_user_uuid' => $to->uuid,
        ], $this->headers($from))->assertStatus(422);
    }

    public function test_self_proposal_blocked(): void
    {
        $t = Tournament::factory()->create();
        $u = User::factory()->create();
        TournamentInterest::create(['tournament_id' => $t->id, 'user_id' => $u->id]);

        $this->postJson("/api/v1/tournaments/{$t->uuid}/propose-to-partner", [
            'target_user_uuid' => $u->uuid,
        ], $this->headers($u))->assertStatus(422);
    }

    public function test_accept_proposal(): void
    {
        Event::fake([ProposalResponded::class]);
        [$t, $from, $to] = $this->seedSeeking();
        $p = Proposal::create([
            'type' => 'tournament_partner',
            'from_user_id' => $from->id, 'to_user_id' => $to->id,
            'tournament_id' => $t->id, 'status' => 'pending',
        ]);

        $this->putJson("/api/v1/proposals/{$p->uuid}/respond", [
            'response' => 'accepted',
        ], $this->headers($to))->assertOk();

        $this->assertSame('accepted', $p->fresh()->status);
        Event::assertDispatched(ProposalResponded::class);
    }

    public function test_refuse_proposal(): void
    {
        [$t, $from, $to] = $this->seedSeeking();
        $p = Proposal::create([
            'type' => 'tournament_partner',
            'from_user_id' => $from->id, 'to_user_id' => $to->id,
            'tournament_id' => $t->id, 'status' => 'pending',
        ]);

        $this->putJson("/api/v1/proposals/{$p->uuid}/respond", [
            'response' => 'refused',
        ], $this->headers($to))->assertOk();

        $this->assertSame('refused', $p->fresh()->status);
    }

    public function test_cancel_proposal_by_from_user(): void
    {
        [$t, $from, $to] = $this->seedSeeking();
        $p = Proposal::create([
            'type' => 'tournament_partner',
            'from_user_id' => $from->id, 'to_user_id' => $to->id,
            'tournament_id' => $t->id, 'status' => 'pending',
        ]);

        $this->deleteJson("/api/v1/proposals/{$p->uuid}", [], $this->headers($from))
            ->assertOk();

        $this->assertSoftDeleted('proposals', ['id' => $p->id]);
    }

    public function test_cancel_proposal_by_to_user_forbidden(): void
    {
        [$t, $from, $to] = $this->seedSeeking();
        $p = Proposal::create([
            'type' => 'tournament_partner',
            'from_user_id' => $from->id, 'to_user_id' => $to->id,
            'tournament_id' => $t->id, 'status' => 'pending',
        ]);

        $this->deleteJson("/api/v1/proposals/{$p->uuid}", [], $this->headers($to))
            ->assertForbidden();
    }

    public function test_listing_filter_direction_and_status(): void
    {
        [$t, $from, $to] = $this->seedSeeking();
        Proposal::create(['type' => 'tournament_partner', 'from_user_id' => $from->id,
            'to_user_id' => $to->id, 'tournament_id' => $t->id, 'status' => 'pending']);
        Proposal::create(['type' => 'tournament_partner', 'from_user_id' => $to->id,
            'to_user_id' => $from->id, 'tournament_id' => $t->id, 'status' => 'accepted']);

        $res = $this->getJson('/api/v1/proposals?direction=received&status=pending', $this->headers($to));
        $res->assertOk()->assertJsonCount(1, 'data');

        $res = $this->getJson('/api/v1/proposals?direction=sent', $this->headers($from));
        $res->assertOk()->assertJsonCount(1, 'data');
    }
}
