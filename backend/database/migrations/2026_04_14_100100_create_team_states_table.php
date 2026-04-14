<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // État dynamique par équipe — pivot du moteur de reclassement.
        // Mis à jour après chaque match validé par MatchEngineService::reclassify().
        Schema::create('team_states', function (Blueprint $table) {
            $table->id();

            $table->foreignId('tournament_id')->constrained('tournaments')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained('tournament_teams')->cascadeOnDelete();

            $table->unsignedSmallInteger('wins')->default(0);
            $table->unsignedSmallInteger('losses')->default(0);

            // bloc : 'main' | 'classement_R{n}' | 'classement_R{n}_L{m}'.
            // Le loser d'un match passe de 'main' vers 'classement_R{round}' → pas de bracket figé.
            $table->string('bloc', 50)->default('main');

            // true = équipe attend d'être appariée lors du prochain cycle de génération dynamique.
            $table->boolean('waiting_for_match')->default(false);

            // Anti-rematch : liste des team_ids déjà affrontés (JSON simple pour lookup rapide côté PHP).
            $table->json('opponents_played');
            // Historique complet : [{match_id, round, result: 'win'|'loss'|'bye', opponent_id, score}].
            $table->json('match_history');

            $table->unsignedSmallInteger('eliminated_at_round')->nullable();
            $table->unsignedSmallInteger('final_position')->nullable();

            $table->timestamps();

            // Une seule ligne d'état par (tournoi, équipe).
            $table->unique(['tournament_id', 'team_id']);
            // Requête fréquente : lister les équipes d'un bloc donné lors de la génération dynamique.
            $table->index(['tournament_id', 'bloc']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_states');
    }
};
