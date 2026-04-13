<?php

namespace Tests\Feature\Club;

use App\Models\Club;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchClubsTest extends TestCase
{
    use RefreshDatabase;

    private function seedClubs(): void
    {
        Club::factory()->create(['name' => 'Padel Club Paris', 'city' => 'Paris', 'department' => '75', 'postal_code' => '75001']);
        Club::factory()->create(['name' => 'Tennis Montpellier', 'city' => 'Montpellier', 'department' => '34', 'postal_code' => '34000']);
        Club::factory()->create(['name' => 'Padel Sète', 'city' => 'Sète', 'department' => '34', 'postal_code' => '34200']);
        Club::factory()->inactive()->create(['name' => 'Hidden Club', 'city' => 'Lyon', 'department' => '69']);
    }

    public function test_no_filter_returns_paginated_active_clubs(): void
    {
        $this->seedClubs();

        $response = $this->getJson('/api/v1/clubs/search');

        $response->assertOk()
            ->assertJsonStructure(['data' => [['uuid', 'name', 'city']], 'links', 'meta']);

        $this->assertSame(3, $response->json('meta.total')); // 4 - 1 inactive
    }

    public function test_filter_q_padel(): void
    {
        $this->seedClubs();

        $response = $this->getJson('/api/v1/clubs/search?q=padel');

        $response->assertOk();
        $this->assertSame(2, $response->json('meta.total'));
        $names = collect($response->json('data'))->pluck('name')->all();
        $this->assertContains('Padel Club Paris', $names);
        $this->assertContains('Padel Sète', $names);
    }

    public function test_filter_department_34(): void
    {
        $this->seedClubs();

        $response = $this->getJson('/api/v1/clubs/search?department=34');

        $response->assertOk();
        $this->assertSame(2, $response->json('meta.total'));
        $depts = collect($response->json('data'))->pluck('department')->unique()->values()->all();
        $this->assertSame(['34'], $depts);
    }

    public function test_short_query_returns_422(): void
    {
        $this->getJson('/api/v1/clubs/search?q=a')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['q']);
    }

    public function test_per_page_over_limit_returns_422(): void
    {
        $this->getJson('/api/v1/clubs/search?per_page=51')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['per_page']);
    }
}
