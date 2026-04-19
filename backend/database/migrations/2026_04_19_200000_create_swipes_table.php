<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('swipes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('to_user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('action', ['like', 'pass']);
            $table->timestamps();

            // Un user ne peut swipe qu'une fois un autre user (upsert côté service).
            // L'inverse (to→from) est géré par une ligne séparée.
            $table->unique(['from_user_id', 'to_user_id']);
            // Lookup reverse-direction fréquent pour détecter les mutual likes.
            $table->index(['to_user_id', 'action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('swipes');
    }
};
