<?php

namespace Tests\Feature\Tournament;

use App\Models\Club;
use App\Models\Tournament;
use App\Models\User;
use App\Modules\Tournament\Events\TournamentCreated;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class TournamentCrudTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        return $user->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    private function payload(Club $club, array $overrides = []): array
    {
        return array_merge([
            'club_uuid' => $club->uuid,
            'name' => 'Open de Paris',
            'type' => 'open',
            'level' => 'P100',
            'date' => now()->addDays(30)->toDateString(),
            'start_time' => '09:00',
            'max_teams' => 16,
        ], $overrides);
    }

    public function test_create_valid_returns_201_with_auto_share_link(): void
    {
        Event::fake([TournamentCreated::class]);
        $user = User::factory()->create();
        $club = Club::factory()->create();

        $response = $this->postJson('/api/v1/tournaments', $this->payload($club), [
            'Authorization' => "Bearer {$this->token($user)}",
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['data' => ['uuid', 'share_link', 'status'], 'message'])
            ->assertJsonPath('data.status', 'open');

        $this->assertStringContainsString('/tournois/', $response->json('data.share_link'));

        Event::assertDispatched(TournamentCreated::class);
    }

    public function test_create_invalid_club_uuid_returns_422(): void
    {
        $user = User::factory()->create();
        $club = Club::factory()->inactive()->create();

        $this->postJson('/api/v1/tournaments', $this->payload($club), [
            'Authorization' => "Bearer {$this->token($user)}",
        ])->assertStatus(422)->assertJsonValidationErrors(['club_uuid']);
    }

    public function test_create_date_in_past_returns_422(): void
    {
        $user = User::factory()->create();
        $club = Club::factory()->create();

        $this->postJson('/api/v1/tournaments', $this->payload($club, ['date' => now()->subDay()->toDateString()]), [
            'Authorization' => "Bearer {$this->token($user)}",
        ])->assertStatus(422)->assertJsonValidationErrors(['date']);
    }

    public function test_create_deadline_after_date_returns_422(): void
    {
        $user = User::factory()->create();
        $club = Club::factory()->create();

        $this->postJson('/api/v1/tournaments', $this->payload($club, [
            'date' => now()->addDays(10)->toDateString(),
            'inscription_deadline' => now()->addDays(20)->toDateString(),
        ]), [
            'Authorization' => "Bearer {$this->token($user)}",
        ])->assertStatus(422)->assertJsonValidationErrors(['inscription_deadline']);
    }

    public function test_create_without_token_returns_401(): void
    {
        $club = Club::factory()->create();
        $this->postJson('/api/v1/tournaments', $this->payload($club))->assertStatus(401);
    }

    public function test_list_paginated(): void
    {
        Tournament::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/tournaments');

        $response->assertOk()
            ->assertJsonStructure(['data', 'links', 'meta']);
        $this->assertSame(3, $response->json('meta.total'));
    }

    public function test_list_filter_by_level(): void
    {
        Tournament::factory()->create(['level' => 'P100']);
        Tournament::factory()->create(['level' => 'P25']);
        Tournament::factory()->create(['level' => 'P100']);

        $response = $this->getJson('/api/v1/tournaments?level=P100');
        $this->assertSame(2, $response->json('meta.total'));
    }

    public function test_show_returns_tournament_with_club(): void
    {
        $t = Tournament::factory()->create(['name' => 'Open de Paris']);

        $this->getJson("/api/v1/tournaments/{$t->uuid}")
            ->assertOk()
            ->assertJsonPath('data.uuid', $t->uuid)
            ->assertJsonPath('data.name', 'Open de Paris')
            ->assertJsonPath('data.teams_count', 0)
            ->assertJsonStructure(['data' => ['club' => ['uuid', 'name']]]);
    }

    public function test_show_invalid_uuid_returns_404(): void
    {
        $this->getJson('/api/v1/tournaments/00000000-0000-7000-8000-000000000000')
            ->assertStatus(404);
    }

    public function test_update_by_owner_returns_200(): void
    {
        $owner = User::factory()->create();
        $t = Tournament::factory()->create(['created_by_user_id' => $owner->id]);

        $this->patchJson("/api/v1/tournaments/{$t->uuid}", ['name' => 'Nouveau nom'], [
            'Authorization' => "Bearer {$this->token($owner)}",
        ])->assertOk()->assertJsonPath('data.name', 'Nouveau nom');
    }

    public function test_update_by_non_owner_returns_403(): void
    {
        $other = User::factory()->create();
        $t = Tournament::factory()->create();

        $this->patchJson("/api/v1/tournaments/{$t->uuid}", ['name' => 'Hack'], [
            'Authorization' => "Bearer {$this->token($other)}",
        ])->assertStatus(403);
    }

    public function test_update_when_in_progress_returns_403(): void
    {
        $owner = User::factory()->create();
        $t = Tournament::factory()->inProgress()->create(['created_by_user_id' => $owner->id]);

        $this->patchJson("/api/v1/tournaments/{$t->uuid}", ['name' => 'Nope'], [
            'Authorization' => "Bearer {$this->token($owner)}",
        ])->assertStatus(403);
    }

    public function test_delete_by_owner_returns_204_soft_delete(): void
    {
        $owner = User::factory()->create();
        $t = Tournament::factory()->create(['created_by_user_id' => $owner->id]);

        $this->deleteJson("/api/v1/tournaments/{$t->uuid}", [], [
            'Authorization' => "Bearer {$this->token($owner)}",
        ])->assertNoContent();

        $this->assertSoftDeleted('tournaments', ['id' => $t->id]);
    }

    public function test_for_me_filters_by_preferred_levels(): void
    {
        $user = User::factory()->create(['city' => 'Paris']);
        $user->preferredLevels()->create(['level' => 'P100']);
        $paris = Club::factory()->create(['city' => 'Paris']);
        $lyon = Club::factory()->create(['city' => 'Lyon']);

        Tournament::factory()->create(['club_id' => $paris->id, 'level' => 'P100']);
        Tournament::factory()->create(['club_id' => $paris->id, 'level' => 'P25']); // bad level
        Tournament::factory()->create(['club_id' => $lyon->id, 'level' => 'P100']); // bad city

        $response = $this->getJson('/api/v1/tournaments/for-me', [
            'Authorization' => "Bearer {$this->token($user)}",
        ]);

        $response->assertOk();
        $this->assertSame(1, $response->json('meta.total'));
    }

    public function test_for_me_fallback_when_no_city_match(): void
    {
        $user = User::factory()->create(['city' => 'Nowhereville']);
        $user->preferredLevels()->create(['level' => 'P100']);
        $club = Club::factory()->create(['city' => 'Paris']);

        Tournament::factory()->create(['club_id' => $club->id, 'level' => 'P100']);

        $response = $this->getJson('/api/v1/tournaments/for-me', [
            'Authorization' => "Bearer {$this->token($user)}",
        ]);

        // Primary query (avec ville) retourne 0 → fallback sans ville → 1 résultat
        $this->assertSame(1, $response->json('meta.total'));
    }

    public function test_for_me_without_token_returns_401(): void
    {
        $this->getJson('/api/v1/tournaments/for-me')->assertStatus(401);
    }

    public function test_qrcode_returns_payload(): void
    {
        $t = Tournament::factory()->create();
        // share_link nullable si créé via factory sans le service → on le pose manuellement
        $t->update(['share_link' => "http://localhost:3000/tournois/{$t->uuid}"]);

        $response = $this->getJson("/api/v1/tournaments/{$t->uuid}/qrcode");

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'share_link',
                    'tournament' => ['uuid', 'name', 'date', 'status'],
                    'club' => ['name', 'city'],
                ],
            ]);
    }
}
