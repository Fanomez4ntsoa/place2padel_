<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('private_messages', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();

            $table->text('text');
            // type : 'text' (standard), 'tournament_proposal' (message auto à la création d'une proposal),
            // 'system' (annonces ex: "Conversation créée suite à proposition").
            $table->enum('type', ['text', 'tournament_proposal', 'system'])->default('text');
            // data : payload structuré selon type (ex: proposal_uuid, tournament_uuid).
            $table->json('data')->nullable();

            $table->timestamps();

            // Requête clé : charger les N derniers messages d'une conversation triés.
            $table->index(['conversation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('private_messages');
    }
};
