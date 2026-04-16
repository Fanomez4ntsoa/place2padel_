<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('friendly_matches', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('club_id')->nullable()->constrained('clubs')->nullOnDelete();

            $table->enum('status', ['pending', 'accepted', 'declined', 'in_progress', 'completed'])
                ->default('pending');

            // Score — même pattern que tournament_matches (9 jeux + tie-break 8-8).
            $table->unsignedTinyInteger('team1_games')->nullable();
            $table->unsignedTinyInteger('team2_games')->nullable();
            $table->unsignedTinyInteger('tiebreak_team1')->nullable();
            $table->unsignedTinyInteger('tiebreak_team2')->nullable();
            $table->unsignedTinyInteger('winner_team')->nullable(); // 1 ou 2

            // Double validation capitaine par équipe.
            $table->boolean('validated_by_team1')->default(false);
            $table->boolean('validated_by_team2')->default(false);

            // ELO snapshot à la création (contrat Emergent : figé au POST).
            // JSON pour garder les 4 ELOs du moment de la création — permet recalcul cohérent.
            $table->json('elo_before')->nullable();

            $table->string('location')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('result_photo_url')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('creator_id');
            $table->index('status');
            $table->index('completed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('friendly_matches');
    }
};
