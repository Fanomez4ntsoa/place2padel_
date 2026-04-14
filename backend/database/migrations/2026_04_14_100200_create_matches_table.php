<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->foreignId('tournament_id')->constrained('tournaments')->cascadeOnDelete();
            // pool_id nullable : matchs de bracket / reclassement ne sont liés à aucune poule.
            $table->foreignId('pool_id')->nullable()->constrained('pools')->nullOnDelete();

            // phase : 'poule' | 'bracket' | 'classement' (évolutif, VARCHAR souple).
            $table->string('phase', 30);
            // bloc : 'main' | 'classement_R{n}' | 'classement_R{n}_L{m}' — pivot du reclassement dynamique.
            $table->string('bloc', 50)->default('main');

            $table->unsignedSmallInteger('round')->nullable();
            $table->unsignedSmallInteger('match_number')->nullable();

            $table->foreignId('team1_id')->constrained('tournament_teams')->cascadeOnDelete();
            // team2_id nullable = BYE (team1 passe sans jouer).
            $table->foreignId('team2_id')->nullable()->constrained('tournament_teams')->cascadeOnDelete();

            // Score : jeux 0-9. Tie-break rempli uniquement si 8-8 (ex: 8-8 + tb 10-8).
            $table->unsignedTinyInteger('team1_games')->nullable();
            $table->unsignedTinyInteger('team2_games')->nullable();
            $table->unsignedTinyInteger('tiebreak_team1')->nullable();
            $table->unsignedTinyInteger('tiebreak_team2')->nullable();

            $table->enum('status', ['pending', 'in_progress', 'completed', 'forfeit'])->default('pending');

            // Double validation capitaines : match = completed quand les deux à true.
            $table->boolean('validated_by_team1')->default(false);
            $table->boolean('validated_by_team2')->default(false);

            $table->foreignId('winner_team_id')->nullable()->constrained('tournament_teams')->nullOnDelete();

            $table->unsignedSmallInteger('court')->nullable();
            $table->timestamp('estimated_time')->nullable();

            $table->timestamps();

            // Requêtes clés : liste matchs d'un tournoi triée, filtres par bloc (reclassement), par statut.
            $table->index(['tournament_id', 'round', 'match_number']);
            $table->index(['tournament_id', 'bloc']);
            $table->index(['tournament_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matches');
    }
};
