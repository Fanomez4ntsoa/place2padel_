<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('club_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('club_id')->constrained('clubs')->cascadeOnDelete();
            $table->timestamps();

            // Un user ne peut s'abonner qu'une fois à un club donné.
            $table->unique(['user_id', 'club_id']);

            // Index reverse utile pour _notify_club_subscribers (Phase 2 :
            // "donne-moi tous les abonnés du club X").
            $table->index('club_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('club_subscriptions');
    }
};
