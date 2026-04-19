<?php

namespace Tests\Feature\Auth;

use App\Models\Club;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests d'extension Phase 6.2 : register accepte et persiste désormais
 * position, padel_level, bio, availabilities (tuples), clubs (array max:3).
 */
class RegisterExtendedFieldsTest extends TestCase
{
    use RefreshDatabase;

    private function basePayload(array $overrides = []): array
    {
        return array_merge([
            'email' => 'sophie@gmail.com',
            'password' => 'Password123',
            'first_name' => 'Sophie',
            'last_name' => 'Martin',
            'role' => 'player',
        ], $overrides);
    }

    public function test_register_persists_position_padel_level_bio_on_user_profile(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'position' => 'right',
            'padel_level' => 4,
            'bio' => 'Joueuse régulière, je cherche des tournois mixtes.',
        ]));

        $response->assertCreated();

        $user = User::where('email', 'sophie@gmail.com')->firstOrFail();
        $this->assertSame('right', $user->profile->position);
        $this->assertSame(4, $user->profile->padel_level);
        $this->assertSame('Joueuse régulière, je cherche des tournois mixtes.', $user->profile->bio);
    }

    public function test_register_persists_availabilities_with_periods(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'availabilities' => [
                ['day_of_week' => 1, 'period' => 'evening'],
                ['day_of_week' => 6, 'period' => 'morning'],
                ['day_of_week' => 6, 'period' => 'afternoon'],
            ],
        ]));

        $response->assertCreated();

        $user = User::where('email', 'sophie@gmail.com')->firstOrFail();
        $this->assertSame(3, $user->availabilities->count());
        $this->assertTrue($user->availabilities->contains(
            fn ($s) => $s->day_of_week === 1 && $s->period === 'evening'
        ));
        $this->assertTrue($user->availabilities->contains(
            fn ($s) => $s->day_of_week === 6 && $s->period === 'afternoon'
        ));
    }

    public function test_register_accepts_flexible_slot_with_null_day(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'availabilities' => [
                ['day_of_week' => null, 'period' => 'all'],
            ],
        ]));

        $response->assertCreated();

        $user = User::where('email', 'sophie@gmail.com')->firstOrFail();
        $slot = $user->availabilities->first();
        $this->assertNull($slot->day_of_week);
        $this->assertSame('all', $slot->period);
    }

    public function test_register_rejects_null_day_with_non_all_period(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'availabilities' => [
                ['day_of_week' => null, 'period' => 'evening'],
            ],
        ]));

        $response->assertStatus(422);
    }

    public function test_register_rejects_all_period_with_specific_day(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'availabilities' => [
                ['day_of_week' => 3, 'period' => 'all'],
            ],
        ]));

        $response->assertStatus(422);
    }

    public function test_register_dedups_availabilities_on_day_and_period(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'availabilities' => [
                ['day_of_week' => 1, 'period' => 'evening'],
                ['day_of_week' => 1, 'period' => 'evening'],  // doublon strict
                ['day_of_week' => 1, 'period' => 'morning'],  // pas doublon (period diff)
            ],
        ]));

        $response->assertCreated();

        $user = User::where('email', 'sophie@gmail.com')->firstOrFail();
        $this->assertSame(2, $user->availabilities->count());
    }

    public function test_register_rejects_more_than_10_availabilities(): void
    {
        $slots = array_map(
            fn (int $i) => ['day_of_week' => ($i % 7) + 1, 'period' => 'evening'],
            range(1, 11)
        );

        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'availabilities' => $slots,
        ]));

        $response->assertStatus(422);
    }

    public function test_register_accepts_clubs_array_up_to_3_with_priority_ordering(): void
    {
        $clubs = Club::factory()->count(3)->create(['is_active' => true]);

        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'clubs' => [$clubs[0]->uuid, $clubs[1]->uuid, $clubs[2]->uuid],
        ]));

        $response->assertCreated();

        $user = User::where('email', 'sophie@gmail.com')->firstOrFail();
        $pivots = $user->clubs()->orderBy('priority')->get();
        $this->assertSame(3, $pivots->count());
        $this->assertSame($clubs[0]->id, $pivots[0]->club_id);
        $this->assertSame(1, $pivots[0]->priority);
        $this->assertSame($clubs[1]->id, $pivots[1]->club_id);
        $this->assertSame(2, $pivots[1]->priority);
        $this->assertSame($clubs[2]->id, $pivots[2]->club_id);
        $this->assertSame(3, $pivots[2]->priority);
    }

    public function test_register_rejects_clubs_array_of_4(): void
    {
        $clubs = Club::factory()->count(4)->create(['is_active' => true]);

        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'clubs' => $clubs->pluck('uuid')->all(),
        ]));

        $response->assertStatus(422);
    }

    public function test_register_rejects_duplicate_clubs_in_array(): void
    {
        $club = Club::factory()->create(['is_active' => true]);

        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'clubs' => [$club->uuid, $club->uuid],
        ]));

        $response->assertStatus(422);
    }

    public function test_register_rejects_inactive_club_in_clubs_array(): void
    {
        $inactive = Club::factory()->create(['is_active' => false]);

        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'clubs' => [$inactive->uuid],
        ]));

        $response->assertStatus(422);
    }

    public function test_register_clubs_array_prevails_over_club_uuid_singleton(): void
    {
        $clubs = Club::factory()->count(2)->create(['is_active' => true]);
        $legacy = Club::factory()->create(['is_active' => true]);

        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'clubs' => [$clubs[0]->uuid, $clubs[1]->uuid],
            'club_uuid' => $legacy->uuid,
        ]));

        $response->assertCreated();

        $user = User::where('email', 'sophie@gmail.com')->firstOrFail();
        $pivots = $user->clubs()->orderBy('priority')->get();
        $this->assertSame(2, $pivots->count());
        $this->assertFalse($pivots->pluck('club_id')->contains($legacy->id));
    }

    public function test_register_rejects_padel_level_above_5(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'padel_level' => 6,
        ]));

        $response->assertStatus(422);
    }

    public function test_register_rejects_padel_level_of_zero(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'padel_level' => 0,
        ]));

        $response->assertStatus(422);
    }

    public function test_register_rejects_invalid_position(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'position' => 'center',
        ]));

        $response->assertStatus(422);
    }

    public function test_register_rejects_bio_over_1000_chars(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'bio' => str_repeat('a', 1001),
        ]));

        $response->assertStatus(422);
    }

    public function test_register_club_owner_with_bio_persists_description(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->basePayload([
            'email' => 'patron@gmail.com',
            'role' => 'club_owner',
            'bio' => 'Club chaleureux · 4 terrains couverts · tournois mensuels',
        ]));

        $response->assertCreated();

        $user = User::where('email', 'patron@gmail.com')->firstOrFail();
        $this->assertSame('club_owner', $user->role);
        $this->assertSame('Club chaleureux · 4 terrains couverts · tournois mensuels', $user->profile->bio);
    }

    public function test_register_referee_without_extended_fields_still_works(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'marc@gmail.com',
            'password' => 'Password123',
            'first_name' => 'Marc',
            'last_name' => 'Référé',
            'role' => 'referee',
        ]);

        $response->assertCreated();

        $user = User::where('email', 'marc@gmail.com')->firstOrFail();
        $this->assertSame('referee', $user->role);
        $this->assertNull($user->profile->position);
        $this->assertNull($user->profile->padel_level);
        $this->assertNull($user->profile->bio);
        $this->assertSame(0, $user->availabilities->count());
        $this->assertSame(0, $user->clubs->count());
    }
}
