<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            // author_id cascadeOnDelete : si l'user disparaît, ses posts disparaissent aussi.
            // Pour les posts système, author_id = user admin ou null selon la source du trigger.
            // On garde NOT NULL : les listeners utilisent le créateur du tournoi ou un admin.
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();

            // type :
            //   - 'user' (post utilisateur classique : profil ou salon tournoi)
            //   - 'system_new_tournament' (trigger TournamentCreated)
            //   - 'system_result' (trigger TournamentCompleted)
            $table->enum('type', ['user', 'system_new_tournament', 'system_result'])->default('user');

            // text nullable : un post peut être image-only.
            $table->text('text')->nullable();
            $table->string('image_url', 500)->nullable();

            // tournament_id nullable : posts profil libres (sans tournoi rattaché).
            $table->foreignId('tournament_id')->nullable()->constrained('tournaments')->cascadeOnDelete();

            // Compteurs dénormalisés — maintenus transactionnellement par FeedService
            // (corrige le bug Emergent où comments_count n'était jamais synced).
            $table->unsignedInteger('likes_count')->default(0);
            $table->unsignedInteger('comments_count')->default(0);

            $table->timestamps();
            $table->softDeletes();

            // Requêtes clés :
            // - feed trié : (created_at DESC)
            // - feed d'un tournoi (salon) : (tournament_id, created_at)
            // - posts d'un user (profil) : (author_id, created_at)
            $table->index('created_at');
            $table->index(['tournament_id', 'created_at']);
            $table->index(['author_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
