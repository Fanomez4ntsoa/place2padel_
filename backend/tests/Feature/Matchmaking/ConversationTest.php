<?php

namespace Tests\Feature\Matchmaking;

use App\Models\Conversation;
use App\Models\Notification;
use App\Models\PrivateMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConversationTest extends TestCase
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

    private function seedPair(): array
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        [$lo, $hi] = [min($a->id, $b->id), max($a->id, $b->id)];
        $conv = Conversation::create(['user_a_id' => $lo, 'user_b_id' => $hi]);
        return [$a, $b, $conv];
    }

    public function test_list_conversations_embeds_other_user(): void
    {
        [$a, $b, $conv] = $this->seedPair();
        $conv->update(['last_message' => 'hello', 'last_message_at' => now()]);

        $res = $this->getJson('/api/v1/conversations', $this->headers($a));
        $res->assertOk();
        $data = $res->json('data');
        $this->assertCount(1, $data);
        $this->assertSame($b->uuid, $data[0]['other_user']['uuid']);
        $this->assertSame('hello', $data[0]['last_message']);
    }

    public function test_post_message_updates_last_message(): void
    {
        [$a, , $conv] = $this->seedPair();

        $this->postJson("/api/v1/conversations/{$conv->uuid}/messages", [
            'text' => 'Yo coéquipier',
        ], $this->headers($a))->assertSuccessful();

        $fresh = $conv->fresh();
        $this->assertSame('Yo coéquipier', $fresh->last_message);
        $this->assertNotNull($fresh->last_message_at);
        $this->assertSame(1, PrivateMessage::count());
    }

    public function test_non_participant_cannot_post(): void
    {
        [, , $conv] = $this->seedPair();
        $intruder = User::factory()->create();

        $this->postJson("/api/v1/conversations/{$conv->uuid}/messages", [
            'text' => 'spam',
        ], $this->headers($intruder))->assertForbidden();
    }

    public function test_non_participant_cannot_list_messages(): void
    {
        [, , $conv] = $this->seedPair();
        $intruder = User::factory()->create();

        $this->getJson("/api/v1/conversations/{$conv->uuid}/messages", $this->headers($intruder))
            ->assertForbidden();
    }

    public function test_list_messages_chronological_order(): void
    {
        [$a, , $conv] = $this->seedPair();
        PrivateMessage::create(['conversation_id' => $conv->id, 'sender_id' => $a->id, 'text' => '1', 'type' => 'text']);
        PrivateMessage::create(['conversation_id' => $conv->id, 'sender_id' => $a->id, 'text' => '2', 'type' => 'text']);
        PrivateMessage::create(['conversation_id' => $conv->id, 'sender_id' => $a->id, 'text' => '3', 'type' => 'text']);

        $res = $this->getJson("/api/v1/conversations/{$conv->uuid}/messages", $this->headers($a));
        $res->assertOk();
        $texts = array_column($res->json('data'), 'text');
        $this->assertSame(['1', '2', '3'], $texts);
    }

    public function test_mark_conversation_read_sets_read_at_on_message_notifications(): void
    {
        [$a, , $conv] = $this->seedPair();

        // 2 notifications 'message' non-lues pointant sur cette conv + 1 sur une autre conv + 1 déjà lue.
        $otherUuid = '019d9999-0000-7000-8000-000000000000';
        Notification::create([
            'user_id' => $a->id, 'type' => 'message', 'title' => 't', 'message' => 'm',
            'data' => ['conversation_uuid' => $conv->uuid],
        ]);
        Notification::create([
            'user_id' => $a->id, 'type' => 'message', 'title' => 't', 'message' => 'm',
            'data' => ['conversation_uuid' => $conv->uuid],
        ]);
        Notification::create([
            'user_id' => $a->id, 'type' => 'message', 'title' => 't', 'message' => 'm',
            'data' => ['conversation_uuid' => $otherUuid],
        ]);
        Notification::create([
            'user_id' => $a->id, 'type' => 'message', 'title' => 't', 'message' => 'm',
            'data' => ['conversation_uuid' => $conv->uuid],
            'read_at' => now()->subHour(),
        ]);

        $res = $this->putJson("/api/v1/conversations/{$conv->uuid}/read", [], $this->headers($a));
        $res->assertOk()->assertJsonPath('data.marked_read', 2);

        // Les 2 unread de cette conv sont lus, la conv autre et la déjà-lue inchangées.
        $unreadForConv = Notification::where('user_id', $a->id)
            ->where('type', 'message')
            ->whereNull('read_at')
            ->get()
            ->filter(fn ($n) => ($n->data['conversation_uuid'] ?? null) === $conv->uuid)
            ->count();
        $this->assertSame(0, $unreadForConv);

        $unreadOtherConv = Notification::where('user_id', $a->id)
            ->where('type', 'message')
            ->whereNull('read_at')
            ->get()
            ->filter(fn ($n) => ($n->data['conversation_uuid'] ?? null) === $otherUuid)
            ->count();
        $this->assertSame(1, $unreadOtherConv);
    }

    public function test_mark_conversation_read_refuses_non_participant(): void
    {
        [, , $conv] = $this->seedPair();
        $intruder = User::factory()->create();

        $this->putJson("/api/v1/conversations/{$conv->uuid}/read", [], $this->headers($intruder))
            ->assertForbidden();
    }

    public function test_mark_conversation_read_is_idempotent(): void
    {
        [$a, , $conv] = $this->seedPair();

        $first = $this->putJson("/api/v1/conversations/{$conv->uuid}/read", [], $this->headers($a));
        $first->assertOk()->assertJsonPath('data.marked_read', 0);

        $second = $this->putJson("/api/v1/conversations/{$conv->uuid}/read", [], $this->headers($a));
        $second->assertOk()->assertJsonPath('data.marked_read', 0);
    }
}
