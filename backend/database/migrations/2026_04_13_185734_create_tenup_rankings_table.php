<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenup_rankings', function (Blueprint $table) {
            $table->id();

            $table->string('name', 191);
            $table->string('first_name', 100);
            $table->string('last_name', 100);

            // Nullable : certains rangs PDF non parsables (présence d'astérisques bizarres, lignes corrompues).
            $table->unsignedInteger('ranking')->nullable();
            $table->unsignedInteger('points')->default(0);
            $table->string('evolution', 10)->nullable();

            $table->enum('gender', ['masculin', 'feminin']);
            $table->char('country', 2)->default('FR');
            $table->string('region', 100)->nullable();

            // Date d'édition du PDF FFT (pas un timestamp Laravel — info métier).
            $table->timestamp('updated_at')->nullable();

            // Index pour : auto-sync à l'inscription, search FFT, classement leaderboard.
            $table->index(['last_name', 'first_name']);
            $table->index('gender');
            $table->index('points'); // MySQL 8 scan B-tree dans les 2 sens, OK pour ORDER BY DESC
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenup_rankings');
    }
};
