<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_preferred_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('level', 10); // P25, P50, P100, P250, P500, P1000, P2000
            $table->timestamps();

            $table->unique(['user_id', 'level']);
            $table->index('level');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_preferred_levels');
    }
};
