<?php

namespace Tests\Feature\Notification;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $u): string
    {
        return $u->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    private function makeNotif(User $user, array $overrides = []): Notification
    {
        return Notification::create(array_merge([
            'user_id' => $user->id,
            'type' => 'registration',
            'title' => 'Test',
            'message' => 'Message test',
        ], $overrides));
    }

    public function test_list_paginated(): void
    {
        $user = User::factory()->create();
        for ($i = 0; $i < 3; $i++) {
            $this->makeNotif($user, ['title' => "N{$i}"]);
        }

        $res = $this->getJson('/api/v1/notifications', [
            'Authorization' => "Bearer {$this->token($user)}",
        ]);

        $res->assertOk()
            ->assertJsonStructure(['data' => [['uuid', 'type', 'title', 'message', 'read_at', 'created_at']], 'meta'])
            ->assertJsonCount(3, 'data');
    }

    public function test_filter_unread(): void
    {
        $user = User::factory()->create();
        $this->makeNotif($user, ['read_at' => now()]);
        $this->makeNotif($user);
        $this->makeNotif($user);

        $res = $this->getJson('/api/v1/notifications?unread=1', [
            'Authorization' => "Bearer {$this->token($user)}",
        ]);
        $res->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_mark_read_sets_timestamp(): void
    {
        $user = User::factory()->create();
        $n = $this->makeNotif($user);

        $this->putJson("/api/v1/notifications/{$n->uuid}/read", [], [
            'Authorization' => "Bearer {$this->token($user)}",
        ])->assertOk();

        $this->assertNotNull($n->fresh()->read_at);
    }

    public function test_mark_read_is_idempotent(): void
    {
        $user = User::factory()->create();
        $n = $this->makeNotif($user, ['read_at' => now()->subHour()]);
        $original = $n->read_at->copy();

        $this->putJson("/api/v1/notifications/{$n->uuid}/read", [], [
            'Authorization' => "Bearer {$this->token($user)}",
        ])->assertOk();

        // markAsRead() no-op si déjà lue — timestamp préservé.
        $this->assertSame($original->timestamp, $n->fresh()->read_at->timestamp);
    }

    public function test_mark_all_read(): void
    {
        $user = User::factory()->create();
        $this->makeNotif($user);
        $this->makeNotif($user);
        $this->makeNotif($user, ['read_at' => now()]); // déjà lue — pas comptée.

        $res = $this->putJson('/api/v1/notifications/read-all', [], [
            'Authorization' => "Bearer {$this->token($user)}",
        ]);

        $res->assertOk()->assertJsonPath('marked', 2);
        $this->assertSame(0, $user->notifications()->whereNull('read_at')->count());
    }

    public function test_unauthenticated_is_401(): void
    {
        $this->getJson('/api/v1/notifications')->assertUnauthorized();
    }

    public function test_cannot_read_other_users_notification(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $n = $this->makeNotif($alice);

        $this->putJson("/api/v1/notifications/{$n->uuid}/read", [], [
            'Authorization' => "Bearer {$this->token($bob)}",
        ])->assertForbidden();
    }
}
