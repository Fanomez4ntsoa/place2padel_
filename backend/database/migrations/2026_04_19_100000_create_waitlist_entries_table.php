<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('waitlist_entries', function (Blueprint $table) {
            $table->id();
            $table->string('email', 191);
            $table->enum('feature', ['reservation', 'coaching', 'stage', 'animation', 'rencontre']);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            // Anti-doublon par (email, feature). Un user peut rejoindre plusieurs features.
            $table->unique(['email', 'feature']);
            $table->index('feature');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waitlist_entries');
    }
};
