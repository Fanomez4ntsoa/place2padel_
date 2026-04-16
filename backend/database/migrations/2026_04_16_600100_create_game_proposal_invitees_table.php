<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_proposal_invitees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_proposal_id')->constrained('game_proposals')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->enum('response', ['pending', 'accepted', 'refused'])->default('pending');
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            // Un user ne peut être invité qu'une fois par proposition.
            $table->unique(['game_proposal_id', 'user_id']);
            $table->index('user_id');
            $table->index('response');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_proposal_invitees');
    }
};
