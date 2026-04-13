<?php

namespace Tests\Feature\Club;

use App\Models\Club;
use App\Models\ClubSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClubSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    private function accessToken(User $user): string
    {
        return $user->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    public function test_subscribe_returns_201(): void
    {
        $user = User::factory()->create();
        $club = Club::factory()->create();
        $token = $this->accessToken($user);

        $response = $this->postJson("/api/v1/clubs/{$club->uuid}/subscribe", [], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.subscribed', true)
            ->assertJsonPath('data.club.uuid', $club->uuid);

        $this->assertDatabaseHas('club_subscriptions', [
            'user_id' => $user->id,
            'club_id' => $club->id,
        ]);
    }

    public function test_re_subscribe_is_idempotent(): void
    {
        $user = User::factory()->create();
        $club = Club::factory()->create();
        $token = $this->accessToken($user);

        $this->postJson("/api/v1/clubs/{$club->uuid}/subscribe", [], [
            'Authorization' => "Bearer {$token}",
        ])->assertCreated();

        $response = $this->postJson("/api/v1/clubs/{$club->uuid}/subscribe", [], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk()
            ->assertJsonPath('data.subscribed', true);

        $this->assertSame(1, ClubSubscription::where('user_id', $user->id)->count());
    }

    public function test_unsubscribe_returns_200(): void
    {
        $user = User::factory()->create();
        $club = Club::factory()->create();
        ClubSubscription::create(['user_id' => $user->id, 'club_id' => $club->id]);
        $token = $this->accessToken($user);

        $response = $this->deleteJson("/api/v1/clubs/{$club->uuid}/subscribe", [], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk()
            ->assertJsonPath('data.subscribed', false);

        $this->assertDatabaseMissing('club_subscriptions', [
            'user_id' => $user->id,
            'club_id' => $club->id,
        ]);
    }

    public function test_re_unsubscribe_is_idempotent(): void
    {
        $user = User::factory()->create();
        $club = Club::factory()->create();
        $token = $this->accessToken($user);

        // Jamais abonné — l'unsubscribe doit quand même renvoyer 200
        $response = $this->deleteJson("/api/v1/clubs/{$club->uuid}/subscribe", [], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk()
            ->assertJsonPath('data.subscribed', false);
    }

    public function test_subscribe_inactive_club_returns_404(): void
    {
        $user = User::factory()->create();
        $club = Club::factory()->inactive()->create();
        $token = $this->accessToken($user);

        $this->postJson("/api/v1/clubs/{$club->uuid}/subscribe", [], [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(404);
    }

    public function test_subscribe_without_token_returns_401(): void
    {
        $club = Club::factory()->create();

        $this->postJson("/api/v1/clubs/{$club->uuid}/subscribe")
            ->assertStatus(401);
    }

    public function test_subscribe_with_refresh_token_returns_401(): void
    {
        $user = User::factory()->create();
        $club = Club::factory()->create();
        $refresh = $user->createToken('refresh', ['refresh'], now()->addDays(7))->plainTextToken;

        $this->postJson("/api/v1/clubs/{$club->uuid}/subscribe", [], [
            'Authorization' => "Bearer {$refresh}",
        ])->assertStatus(401);
    }

    public function test_unsubscribe_without_token_returns_401(): void
    {
        $club = Club::factory()->create();

        $this->deleteJson("/api/v1/clubs/{$club->uuid}/subscribe")
            ->assertStatus(401);
    }
}
