<?php

namespace Tests\Feature\Club;

use App\Models\Club;
use App\Models\ClubSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListSubscriptionsTest extends TestCase
{
    use RefreshDatabase;

    private function accessToken(User $user): string
    {
        return $user->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    public function test_empty_list(): void
    {
        $user = User::factory()->create();
        $token = $this->accessToken($user);

        $response = $this->getJson('/api/v1/clubs/subscriptions', [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk()
            ->assertJsonPath('data', []);
    }

    public function test_list_returns_subscribed_clubs(): void
    {
        $user = User::factory()->create();
        $clubA = Club::factory()->create(['name' => 'Alpha']);
        $clubB = Club::factory()->create(['name' => 'Bravo']);
        Club::factory()->create(['name' => 'Charlie']); // non-abonné
        ClubSubscription::create(['user_id' => $user->id, 'club_id' => $clubA->id]);
        ClubSubscription::create(['user_id' => $user->id, 'club_id' => $clubB->id]);

        $response = $this->getJson('/api/v1/clubs/subscriptions', [
            'Authorization' => "Bearer {$this->accessToken($user)}",
        ]);

        $response->assertOk();
        $names = collect($response->json('data'))->pluck('name')->all();
        $this->assertSame(['Alpha', 'Bravo'], $names); // order by name
    }

    public function test_without_token_returns_401(): void
    {
        $this->getJson('/api/v1/clubs/subscriptions')->assertStatus(401);
    }

    public function test_refresh_token_returns_401(): void
    {
        $user = User::factory()->create();
        $refresh = $user->createToken('refresh', ['refresh'], now()->addDays(7))->plainTextToken;

        $this->getJson('/api/v1/clubs/subscriptions', [
            'Authorization' => "Bearer {$refresh}",
        ])->assertStatus(401);
    }
}
