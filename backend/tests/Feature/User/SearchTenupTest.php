<?php

namespace Tests\Feature\User;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SearchTenupTest extends TestCase
{
    use RefreshDatabase;

    private function seedRankings(): void
    {
        DB::table('tenup_rankings')->insert([
            ['name' => 'Jean Dupont', 'first_name' => 'Jean', 'last_name' => 'Dupont', 'ranking' => 100, 'points' => 9000, 'gender' => 'masculin', 'country' => 'FR', 'region' => 'IDF'],
            ['name' => 'Pierre Duval', 'first_name' => 'Pierre', 'last_name' => 'Duval', 'ranking' => 250, 'points' => 7500, 'gender' => 'masculin', 'country' => 'FR', 'region' => 'IDF'],
            ['name' => 'Marie Dubois', 'first_name' => 'Marie', 'last_name' => 'Dubois', 'ranking' => 50, 'points' => 8000, 'gender' => 'feminin', 'country' => 'FR', 'region' => 'IDF'],
            ['name' => 'Sophie Martin', 'first_name' => 'Sophie', 'last_name' => 'Martin', 'ranking' => 80, 'points' => 7000, 'gender' => 'feminin', 'country' => 'FR', 'region' => 'PACA'],
        ]);
    }

    public function test_valid_search_returns_paginated_structure(): void
    {
        $this->seedRankings();

        $response = $this->getJson('/api/v1/tenup/search?q=Du');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [['name', 'first_name', 'last_name', 'ranking', 'points', 'gender']],
                'links',
                'meta',
            ]);

        // Du* matche Dupont, Duval, Dubois (3 résultats)
        $this->assertSame(3, $response->json('meta.total'));
    }

    public function test_gender_masculin_filter(): void
    {
        $this->seedRankings();

        $response = $this->getJson('/api/v1/tenup/search?q=Du&gender=masculin');

        $response->assertOk();
        $genders = collect($response->json('data'))->pluck('gender')->unique()->values()->all();
        $this->assertSame(['masculin'], $genders);
        $this->assertSame(2, $response->json('meta.total'));
    }

    public function test_gender_feminin_filter(): void
    {
        $this->seedRankings();

        $response = $this->getJson('/api/v1/tenup/search?q=Du&gender=feminin');

        $response->assertOk();
        $genders = collect($response->json('data'))->pluck('gender')->unique()->values()->all();
        $this->assertSame(['feminin'], $genders);
        $this->assertSame(1, $response->json('meta.total'));
    }

    public function test_short_query_returns_422(): void
    {
        $this->getJson('/api/v1/tenup/search?q=a')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['q']);
    }

    public function test_invalid_gender_returns_422(): void
    {
        $this->getJson('/api/v1/tenup/search?q=Du&gender=other')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['gender']);
    }

    public function test_per_page_over_limit_returns_422(): void
    {
        $this->getJson('/api/v1/tenup/search?q=Du&per_page=51')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['per_page']);
    }

    public function test_no_match_returns_empty_data(): void
    {
        $this->seedRankings();

        $response = $this->getJson('/api/v1/tenup/search?q=Zzzz');

        $response->assertOk()
            ->assertJsonPath('data', [])
            ->assertJsonPath('meta.total', 0);
    }
}
