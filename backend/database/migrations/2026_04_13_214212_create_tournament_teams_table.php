<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tournament_teams', function (Blueprint $table) {
            $table->id();

            $table->foreignId('tournament_id')->constrained('tournaments')->cascadeOnDelete();

            // captain = toujours renseigné (l'user qui inscrit).
            $table->foreignId('captain_id')->constrained('users')->restrictOnDelete();
            // partner_id nullable → inscription solo possible (matching Phase 3).
            $table->foreignId('partner_id')->nullable()->constrained('users')->restrictOnDelete();

            // Dénormalisation défensive : préserve l'affichage si un user est soft-deleted
            // (ou un jour purgé) après la fin du tournoi.
            $table->string('captain_name', 191);
            $table->string('partner_name', 191)->nullable();

            $table->unsignedInteger('captain_points')->default(0);
            $table->unsignedInteger('partner_points')->nullable();
            // Somme pour seeding. Si solo : == captain_points.
            $table->unsignedInteger('team_points')->default(0);

            $table->string('team_name', 100);

            // Assigné au launch (null avant).
            $table->unsignedSmallInteger('seed')->nullable();

            // registered = équipe validée, waitlisted = liste d'attente FIFO par created_at.
            $table->enum('status', ['registered', 'waitlisted'])->default('registered');

            $table->timestamps();

            // Un capitaine / partenaire donné ne peut figurer qu'une fois par tournoi
            // sur le même "rôle". La règle cross-rôle (X ne doit pas être captain d'une
            // équipe ET partner d'une autre) est vérifiée côté application (Service).
            $table->unique(['tournament_id', 'captain_id']);
            $table->unique(['tournament_id', 'partner_id']);

            // Requêtes : liste triée par statut + ordre inscription (FIFO waitlist, seeding registered).
            $table->index(['tournament_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournament_teams');
    }
};
