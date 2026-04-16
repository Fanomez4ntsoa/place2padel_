<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_elos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();

            // Niveau déclaré (entier 1-10), source : user_profiles.padel_level au 1er match.
            $table->unsignedTinyInteger('declared_level');
            // ELO calculé (float 2 décimales), commence = declared_level.
            $table->decimal('elo_level', 4, 2);

            $table->unsignedInteger('matches_played')->default(0);
            $table->unsignedInteger('matches_won')->default(0);
            $table->unsignedInteger('matches_lost')->default(0);

            // Lock : recalculé à chaque match → matches_played < 10 (contrat Emergent).
            $table->boolean('is_locked')->default(true);

            // History : append d'un entry à chaque match validé.
            // [{match_uuid, date, result, opponent_avg_elo, elo_before, elo_after}, ...]
            $table->json('history')->nullable();

            $table->timestamp('last_updated_at')->nullable();
            $table->timestamps();

            $table->index('elo_level'); // leaderboard
            $table->index(['is_locked', 'elo_level']); // leaderboard filtré unlocked
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_elos');
    }
};
