<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clubs', function (Blueprint $table) {
            // Patron de club : le user qui a revendiqué le club.
            $table->foreignId('owner_id')
                ->nullable()
                ->after('website')
                ->constrained('users')
                ->nullOnDelete();

            $table->enum('club_type', ['associatif', 'prive'])->nullable()->after('owner_id');
            $table->text('description')->nullable()->after('club_type');
            $table->string('picture_url', 500)->nullable()->after('description');
            $table->boolean('indoor')->nullable()->after('picture_url');
            $table->timestamp('claimed_at')->nullable()->after('indoor');

            $table->index('owner_id');
        });
    }

    public function down(): void
    {
        Schema::table('clubs', function (Blueprint $table) {
            $table->dropForeign(['owner_id']);
            $table->dropIndex(['owner_id']);
            $table->dropColumn(['owner_id', 'club_type', 'description', 'picture_url', 'indoor', 'claimed_at']);
        });
    }
};
