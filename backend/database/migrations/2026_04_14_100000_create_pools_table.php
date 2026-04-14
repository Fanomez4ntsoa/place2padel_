<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pools', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->foreignId('tournament_id')->constrained('tournaments')->cascadeOnDelete();

            // pool_name : 'Poule A', 'Poule B'… — affichage UI.
            $table->string('pool_name', 50);
            // pool_type : 'round_robin' | 'classement_1ers' | 'classement_2es'… — discrimine les poules principales des poules de classement (format poules_classement).
            $table->string('pool_type', 50);

            // Liste des tournament_teams.id appartenant à la poule (ordre = seeding serpentin initial).
            $table->json('team_ids');
            // Standings recalculés après chaque match validé : [{team_id, played, won, lost, games_for, games_against, game_diff, points}].
            $table->json('standings');

            $table->timestamps();

            $table->index('tournament_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pools');
    }
};
