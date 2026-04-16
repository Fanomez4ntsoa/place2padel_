<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_proposals', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete();

            // Planning.
            $table->date('date');
            $table->time('time');
            $table->unsignedSmallInteger('duration_min')->default(90);
            $table->string('club')->nullable();
            $table->string('club_city')->nullable();

            // Cycle de vie.
            $table->enum('status', ['open', 'full', 'cancelled', 'started'])->default('open');

            // Si démarré, pointeur vers le friendly_match créé.
            $table->foreignId('friendly_match_id')->nullable()->constrained('friendly_matches')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index('creator_id');
            $table->index(['status', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_proposals');
    }
};
