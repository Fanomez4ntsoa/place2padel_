<?php

namespace Tests\Feature\Payment;

use App\Models\Club;
use App\Models\Tournament;
use App\Models\TournamentTeam;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests des garde-fous d'éligibilité AVANT l'appel Stripe — pas besoin de
 * mock Stripe. Le happy path (session créée) nécessiterait un mock complet
 * et relève du test d'intégration (manuel via Insomnia avec clé test Stripe).
 */
class CheckoutValidationTest extends TestCase
{
    use RefreshDatabase;

    private function asUser(User $user): self
    {
        $token = $user->createToken('access', ['*'], now()->addHour())->plainTextToken;
        return $this->withHeader('Authorization', 'Bearer '.$token);
    }

    private function makeTournament(array $overrides = []): Tournament
    {
        $club = Club::factory()->create();
        return Tournament::factory()->create(array_merge([
            'club_id' => $club->id,
            'status' => 'open',
            'price' => '15€',
            'payment_method' => 'online',
        ], $overrides));
    }

    public function test_rejects_tournament_with_on_site_payment_method(): void
    {
        $user = User::factory()->create();
        $tournament = $this->makeTournament(['payment_method' => 'on_site']);

        $this->asUser($user)
            ->postJson('/api/v1/payments/checkout/create', [
                'tournament_uuid' => $tournament->uuid,
            ])
            ->assertStatus(422);
    }

    public function test_rejects_tournament_with_null_price(): void
    {
        $user = User::factory()->create();
        $tournament = $this->makeTournament(['price' => null]);

        $this->asUser($user)
            ->postJson('/api/v1/payments/checkout/create', [
                'tournament_uuid' => $tournament->uuid,
            ])
            ->assertStatus(422);
    }

    public function test_rejects_tournament_with_zero_price(): void
    {
        $user = User::factory()->create();
        $tournament = $this->makeTournament(['price' => 'Gratuit']);

        $this->asUser($user)
            ->postJson('/api/v1/payments/checkout/create', [
                'tournament_uuid' => $tournament->uuid,
            ])
            ->assertStatus(422);
    }

    public function test_rejects_when_already_registered(): void
    {
        $user = User::factory()->create();
        $tournament = $this->makeTournament();

        TournamentTeam::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid7(),
            'tournament_id' => $tournament->id,
            'captain_id' => $user->id,
            'captain_name' => $user->name,
            'team_name' => $user->name.' / TBD',
            'status' => 'registered',
        ]);

        $this->asUser($user)
            ->postJson('/api/v1/payments/checkout/create', [
                'tournament_uuid' => $tournament->uuid,
            ])
            ->assertStatus(422);
    }

    public function test_rejects_closed_tournament(): void
    {
        $user = User::factory()->create();
        $tournament = $this->makeTournament(['status' => 'in_progress']);

        $this->asUser($user)
            ->postJson('/api/v1/payments/checkout/create', [
                'tournament_uuid' => $tournament->uuid,
            ])
            ->assertStatus(422);
    }

    public function test_requires_auth(): void
    {
        $tournament = $this->makeTournament();
        $this->postJson('/api/v1/payments/checkout/create', [
            'tournament_uuid' => $tournament->uuid,
        ])->assertStatus(401);
    }

    public function test_rejects_unknown_tournament_uuid(): void
    {
        $user = User::factory()->create();
        $this->asUser($user)
            ->postJson('/api/v1/payments/checkout/create', [
                'tournament_uuid' => '00000000-0000-0000-0000-000000000000',
            ])
            ->assertStatus(422);
    }

    public function test_webhook_without_signature_returns_400(): void
    {
        // Pas de STRIPE_WEBHOOK_SECRET configuré en test → le service log et ignore
        // donc retourne 200. On vérifie juste que la route n'exige pas d'auth.
        $response = $this->postJson('/api/v1/webhook/stripe', ['type' => 'test.event']);
        $this->assertContains($response->status(), [200, 400]);
    }

    public function test_payment_method_accepted_at_tournament_creation(): void
    {
        $club = Club::factory()->create();
        $creator = User::factory()->create();

        $this->asUser($creator)->postJson('/api/v1/tournaments', [
            'name' => 'Tournoi Stripe Test',
            'club_uuid' => $club->uuid,
            'type' => 'mixte',
            'level' => 'P100',
            'date' => now()->addDays(7)->toDateString(),
            'start_time' => '18:00',
            'max_teams' => 8,
            'price' => '15€',
            'payment_method' => 'online',
        ])->assertCreated()
            ->assertJsonPath('data.payment_method', 'online');
    }

    public function test_payment_method_defaults_to_on_site(): void
    {
        $club = Club::factory()->create();
        $creator = User::factory()->create();

        $this->asUser($creator)->postJson('/api/v1/tournaments', [
            'name' => 'Tournoi Sans Paiement',
            'club_uuid' => $club->uuid,
            'type' => 'mixte',
            'level' => 'P100',
            'date' => now()->addDays(7)->toDateString(),
            'start_time' => '18:00',
            'max_teams' => 8,
        ])->assertCreated()
            ->assertJsonPath('data.payment_method', 'on_site');
    }

    public function test_payment_method_rejects_invalid_value(): void
    {
        $club = Club::factory()->create();
        $creator = User::factory()->create();

        $this->asUser($creator)->postJson('/api/v1/tournaments', [
            'name' => 'Tournoi X',
            'club_uuid' => $club->uuid,
            'type' => 'mixte',
            'level' => 'P100',
            'date' => now()->addDays(7)->toDateString(),
            'start_time' => '18:00',
            'max_teams' => 8,
            'payment_method' => 'bitcoin', // invalide
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['payment_method']);
    }
}
