<?php

namespace Tests\Feature\Matchmaking;

use App\Models\Conversation;
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
}
