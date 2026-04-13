<?php

namespace Tests\Feature\User;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchUsersTest extends TestCase
{
    use RefreshDatabase;

    private function authToken(): string
    {
        $viewer = User::factory()->create();
        return $viewer->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    private function seedTargets(): void
    {
        $alice = User::factory()->create([
            'first_name' => 'Alice',
            'last_name' => 'Dupont',
            'name' => 'Alice Dupont',
            'email' => 'alice@gmail.com',
        ]);
        $alice->profile()->create(['license_number' => 'FFT-ALICE-001']);

        $bob = User::factory()->create([
            'first_name' => 'Bob',
            'last_name' => 'Duval',
            'name' => 'Bob Duval',
            'email' => 'bob@gmail.com',
        ]);
        $bob->profile()->create(['license_number' => 'FFT-BOB-002']);
    }

    public function test_valid_search_returns_paginated_structure(): void
    {
        $this->seedTargets();
        $token = $this->authToken();

        $response = $this->getJson('/api/v1/users/search?q=Du', [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [['uuid', 'name']],
                'links' => ['first', 'last', 'prev', 'next'],
                'meta' => ['current_page', 'per_page', 'total'],
            ]);

        $this->assertSame(2, $response->json('meta.total'));
    }

    public function test_results_do_not_leak_email_or_license(): void
    {
        $this->seedTargets();
        $token = $this->authToken();

        $response = $this->getJson('/api/v1/users/search?q=Alice', [
            'Authorization' => "Bearer {$token}",
        ]);

        $body = json_encode($response->json());
        $this->assertStringNotContainsString('alice@gmail.com', $body);
        $this->assertStringNotContainsString('FFT-ALICE-001', $body);
    }

    public function test_short_query_returns_422(): void
    {
        $token = $this->authToken();

        $this->getJson('/api/v1/users/search?q=a', [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(422)->assertJsonValidationErrors(['q']);
    }

    public function test_missing_query_returns_422(): void
    {
        $token = $this->authToken();

        $this->getJson('/api/v1/users/search', [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(422)->assertJsonValidationErrors(['q']);
    }

    public function test_no_token_returns_401(): void
    {
        $this->getJson('/api/v1/users/search?q=Du')->assertStatus(401);
    }

    public function test_refresh_token_returns_401(): void
    {
        $user = User::factory()->create();
        $refresh = $user->createToken('refresh', ['refresh'], now()->addDays(7))->plainTextToken;

        $this->getJson('/api/v1/users/search?q=Du', [
            'Authorization' => "Bearer {$refresh}",
        ])->assertStatus(401);
    }

    public function test_per_page_over_limit_returns_422(): void
    {
        $token = $this->authToken();

        $this->getJson('/api/v1/users/search?q=Du&per_page=51', [
            'Authorization' => "Bearer {$token}",
        ])->assertStatus(422)->assertJsonValidationErrors(['per_page']);
    }

    public function test_search_with_no_match_returns_empty_data(): void
    {
        $this->seedTargets();
        $token = $this->authToken();

        $response = $this->getJson('/api/v1/users/search?q=Zzzz', [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk()
            ->assertJsonPath('data', [])
            ->assertJsonPath('meta.total', 0);
    }
}
