<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_matches', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            // Paire normalisée user_a_id < user_b_id pour garantir l'unicité
            // symétrique (même pattern que la table conversations).
            $table->foreignId('user_a_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('user_b_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_a_id', 'user_b_id']);
            $table->index('user_a_id');
            $table->index('user_b_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_matches');
    }
};
