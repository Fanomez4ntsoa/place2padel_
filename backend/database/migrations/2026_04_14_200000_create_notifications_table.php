<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // type : 'registration', 'waitlist', 'milestone_50', 'convocation', 'reminder_24h', etc.
            // VARCHAR souple — évite migration à chaque nouveau type, validation côté Service.
            $table->string('type', 50);

            $table->string('title', 255);
            $table->text('message');

            // link : route relative côté front (ex: '/tournois/{uuid}').
            $table->string('link', 500)->nullable();
            // data : payload structuré pour le front (ex: {tournament_uuid, match_uuid}).
            $table->json('data')->nullable();

            // read_at : null = non lue. Timestamp plutôt qu'un bool → audit gratuit,
            // permet tri "unread first then recent", filtre par fenêtre temporelle.
            $table->timestamp('read_at')->nullable();

            $table->timestamps();

            // Requêtes clés :
            // - liste d'un user triée DESC : (user_id, created_at DESC)
            // - badge unread : (user_id, read_at) — WHERE read_at IS NULL
            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
