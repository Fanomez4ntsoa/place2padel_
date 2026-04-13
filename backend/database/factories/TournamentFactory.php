<?php

namespace Database\Factories;

use App\Models\Club;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Tournament>
 */
class TournamentFactory extends Factory
{
    protected $model = Tournament::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid7(),
            'club_id' => Club::factory(),
            'created_by_user_id' => User::factory(),
            'name' => 'Tournoi '.fake()->unique()->word(),
            'location' => null,
            'type' => 'open',
            'level' => 'P100',
            'date' => now()->addDays(30)->toDateString(),
            'start_time' => '09:00:00',
            'inscription_deadline' => now()->addDays(25)->toDateString(),
            'max_teams' => 16,
            'courts_available' => 4,
            'price' => null,
            'share_link' => null,
            'status' => 'open',
        ];
    }

    public function full(): static
    {
        return $this->state(fn () => ['status' => 'full']);
    }

    public function inProgress(): static
    {
        return $this->state(fn () => ['status' => 'in_progress', 'launched_at' => now()]);
    }

    public function completed(): static
    {
        return $this->state(fn () => ['status' => 'completed']);
    }
}
