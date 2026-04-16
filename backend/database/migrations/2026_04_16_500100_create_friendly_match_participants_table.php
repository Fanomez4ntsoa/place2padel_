<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('friendly_match_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('friendly_match_id')->constrained('friendly_matches')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('team'); // 1 ou 2
            $table->unsignedTinyInteger('slot'); // 1 ou 2 (position dans l'équipe)
            $table->boolean('is_captain')->default(false);
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();

            // Un user ne peut pas être 2 fois dans le même match.
            $table->unique(['friendly_match_id', 'user_id']);
            // Un slot (team, slot) est unique par match.
            $table->unique(['friendly_match_id', 'team', 'slot']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('friendly_match_participants');
    }
};
