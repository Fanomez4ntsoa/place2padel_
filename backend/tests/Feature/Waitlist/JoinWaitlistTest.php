<?php

namespace Tests\Feature\Waitlist;

use App\Models\User;
use App\Models\WaitlistEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JoinWaitlistTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_user_can_join_waitlist_with_email(): void
    {
        $response = $this->postJson('/api/v1/waitlist', [
            'feature' => 'reservation',
            'email' => 'anonymous@gmail.com',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'already' => false,
            ])
            ->assertJsonStructure(['message', 'already']);

        $this->assertDatabaseHas('waitlist_entries', [
            'email' => 'anonymous@gmail.com',
            'feature' => 'reservation',
            'user_id' => null,
        ]);
    }

    public function test_authenticated_user_joins_waitlist_with_auto_email_and_user_id(): void
    {
        $user = User::factory()->create(['email' => 'voary@gmail.com']);
        $token = $user->createToken('access', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/waitlist', [
                'feature' => 'coaching',
            ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('waitlist_entries', [
            'email' => 'voary@gmail.com',
            'feature' => 'coaching',
            'user_id' => $user->id,
        ]);
    }

    public function test_duplicate_entry_returns_already_true_without_creating_row(): void
    {
        WaitlistEntry::create([
            'email' => 'dup@gmail.com',
            'feature' => 'stage',
        ]);

        $response = $this->postJson('/api/v1/waitlist', [
            'feature' => 'stage',
            'email' => 'dup@gmail.com',
        ]);

        $response->assertOk()
            ->assertJson(['already' => true]);

        $this->assertSame(1, WaitlistEntry::where('email', 'dup@gmail.com')->count());
    }

    public function test_same_email_can_join_multiple_different_features(): void
    {
        $this->postJson('/api/v1/waitlist', [
            'feature' => 'reservation',
            'email' => 'multi@gmail.com',
        ])->assertStatus(201);

        $this->postJson('/api/v1/waitlist', [
            'feature' => 'coaching',
            'email' => 'multi@gmail.com',
        ])->assertStatus(201);

        $this->assertSame(2, WaitlistEntry::where('email', 'multi@gmail.com')->count());
    }

    public function test_invalid_feature_returns_422(): void
    {
        $response = $this->postJson('/api/v1/waitlist', [
            'feature' => 'invalid-feature',
            'email' => 'x@gmail.com',
        ]);

        $response->assertStatus(422);
    }

    public function test_email_normalized_to_lowercase(): void
    {
        $this->postJson('/api/v1/waitlist', [
            'feature' => 'reservation',
            'email' => '  MIXED@Gmail.COM  ',
        ])->assertStatus(201);

        $this->assertDatabaseHas('waitlist_entries', [
            'email' => 'mixed@gmail.com',
        ]);
    }

    public function test_public_user_without_email_returns_422(): void
    {
        $response = $this->postJson('/api/v1/waitlist', [
            'feature' => 'reservation',
        ]);

        $response->assertStatus(422);
    }
}
