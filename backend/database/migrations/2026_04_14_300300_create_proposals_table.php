<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proposals', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            // type VARCHAR(50) pour préparer Phase 4.2 (match_amical, tournament).
            // Phase 4.1 ne produit que 'tournament_partner' — validation côté Request.
            $table->string('type', 50);

            $table->foreignId('from_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('to_user_id')->constrained('users')->cascadeOnDelete();

            // tournament_id nullable : couvre le type 'match_amical' (Phase 4.2) qui
            // n'a pas de tournoi. Obligatoire pour 'tournament_partner' (validation Service).
            $table->foreignId('tournament_id')->nullable()->constrained('tournaments')->cascadeOnDelete();

            // status dédié en colonne (requête fréquente 'pending' pour anti-spam et liste).
            $table->enum('status', ['pending', 'accepted', 'refused'])->default('pending');

            // payload : champs spécifiques selon type (ex: match_amical → club/date/time/level).
            $table->json('payload')->nullable();

            $table->timestamps();
            // Soft deletes : permet annulation d'une proposal pending (DELETE endpoint).
            $table->softDeletes();

            // Requêtes clés :
            // - reçues d'un user filtre status : (to_user_id, status)
            // - anti-spam : (from_user_id, to_user_id, tournament_id, status) — on compte les pending.
            $table->index(['to_user_id', 'status']);
            $table->index(['from_user_id', 'to_user_id', 'tournament_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proposals');
    }
};
