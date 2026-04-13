<?php

namespace Tests\Feature\Club;

use App\Models\Club;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShowClubTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_uuid_returns_200_with_fields(): void
    {
        $club = Club::factory()->create([
            'name' => 'Test Padel',
            'city' => 'Lyon',
            'department' => '69',
            'postal_code' => '69000',
            'phone' => '0400000000',
            'courts_count' => 4,
        ]);

        $response = $this->getJson("/api/v1/clubs/{$club->uuid}");

        $response->assertOk()
            ->assertJsonStructure([
                'data' => ['uuid', 'name', 'slug', 'address', 'city', 'postal_code', 'department', 'region', 'country', 'latitude', 'longitude', 'phone', 'email', 'website', 'courts_count'],
            ])
            ->assertJsonPath('data.uuid', $club->uuid)
            ->assertJsonPath('data.name', 'Test Padel')
            ->assertJsonPath('data.department', '69')
            ->assertJsonPath('data.courts_count', 4);
    }

    public function test_nonexistent_uuid_returns_404(): void
    {
        $this->getJson('/api/v1/clubs/00000000-0000-7000-8000-000000000000')
            ->assertStatus(404);
    }

    public function test_inactive_club_returns_404(): void
    {
        $club = Club::factory()->inactive()->create();

        $this->getJson("/api/v1/clubs/{$club->uuid}")
            ->assertStatus(404);
    }
}
