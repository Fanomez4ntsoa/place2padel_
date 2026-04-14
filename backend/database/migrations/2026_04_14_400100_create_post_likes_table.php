<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('post_likes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('post_id')->constrained('posts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->timestamps();

            // Un user ne peut liker qu'une fois un post donné (toggle via delete/insert).
            $table->unique(['post_id', 'user_id']);
            // Lookup inverse : "est-ce que user X a liké ce post ?" — one-shot via UNIQUE ci-dessus.
            // Index supplémentaire sur user_id pour "mes likes" (feature Phase 5.2+ potentielle).
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('post_likes');
    }
};
