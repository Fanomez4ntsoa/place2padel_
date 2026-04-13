<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();

            $table->text('bio')->nullable();
            $table->enum('position', ['left', 'right', 'both'])->nullable();

            // padel_level = niveau réel du joueur (1-5), distinct de user_preferred_levels
            // (= niveaux de tournois P25/P50/P100... qu'il souhaite jouer, cf. migration 4/5)
            $table->unsignedTinyInteger('padel_level')->nullable();

            $table->string('license_number', 50)->nullable();
            $table->unsignedInteger('padel_points')->default(0);
            $table->unsignedInteger('ranking')->nullable();
            $table->timestamp('tenup_synced_at')->nullable();
            $table->string('tenup_name')->nullable();
            $table->string('region', 100)->nullable();

            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();

            $table->unsignedSmallInteger('max_radius_km')->default(30);
            $table->unsignedSmallInteger('max_radius_training_km')->default(15);

            $table->timestamps();

            $table->index('license_number');
            $table->index('ranking');
            $table->index('padel_points');
            $table->index(['latitude', 'longitude']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_profiles');
    }
};
