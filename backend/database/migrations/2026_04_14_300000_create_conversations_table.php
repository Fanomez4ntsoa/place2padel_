<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            // Contrainte applicative : user_a_id < user_b_id (normalisé par MatchmakingService)
            // → évite les doublons symétriques (A,B) vs (B,A) et garantit l'UNIQUE.
            $table->foreignId('user_a_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('user_b_id')->constrained('users')->cascadeOnDelete();

            // Dénormalisation pour l'affichage liste conversations (évite N+1 sur last msg).
            $table->string('last_message', 500)->nullable();
            $table->timestamp('last_message_at')->nullable();

            $table->timestamps();

            $table->unique(['user_a_id', 'user_b_id']);
            // Tri liste conversations par dernière activité.
            $table->index('last_message_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
