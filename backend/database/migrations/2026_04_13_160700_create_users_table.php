<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable();

            $table->enum('auth_type', ['local', 'google'])->default('local');
            $table->enum('role', ['player', 'organizer', 'referee', 'admin'])->default('player');

            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('name');

            $table->string('picture_url', 500)->nullable();
            $table->string('city', 100)->nullable();
            $table->foreignId('club_id')->nullable()->constrained('clubs')->nullOnDelete();

            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();

            $table->index('role');
            $table->index('last_name');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
