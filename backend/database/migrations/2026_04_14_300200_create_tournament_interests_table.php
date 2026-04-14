<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // "Je suis seul pour ce tournoi" — feature différenciante Phase 4.1.
        // FK + join plutôt que snapshot dénormalisé (décision archi #3).
        Schema::create('tournament_interests', function (Blueprint $table) {
            $table->id();

            $table->foreignId('tournament_id')->constrained('tournaments')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // message : mot optionnel pour se présenter ("Gaucher P500 disponible samedi").
            $table->text('message')->nullable();

            $table->timestamps();

            // Un user ne peut se déclarer qu'une fois par tournoi (idempotence via updateOrCreate).
            $table->unique(['tournament_id', 'user_id']);
            // Requête principale : lister les candidats d'un tournoi.
            $table->index('tournament_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournament_interests');
    }
};
