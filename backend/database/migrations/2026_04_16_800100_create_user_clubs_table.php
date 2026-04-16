<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Pivot user_clubs — remplace users.club_id (singleton) par une relation HasMany
 * triée par priority (1 = principal, 2 = secondaire, 3 = tertiaire).
 *
 * Alignement Emergent 39b6544 ProfilePage.js : un joueur peut déclarer jusqu'à
 * 3 clubs. Le backend enforce max=3 via application (UpdateProfileRequest),
 * pas de contrainte CHECK native portable.
 *
 * Data migration incluse : users.club_id non-null → user_clubs(priority=1),
 * puis drop de la colonne users.club_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_clubs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('club_id')->constrained('clubs')->cascadeOnDelete();
            $table->unsignedTinyInteger('priority')->comment('1=principal, 2=secondaire, 3=tertiaire');
            $table->timestamps();

            $table->unique(['user_id', 'club_id'], 'user_clubs_user_club_unique');
            $table->unique(['user_id', 'priority'], 'user_clubs_user_priority_unique');
            $table->index(['user_id', 'priority']);
        });

        // Data migration : clone users.club_id vers user_clubs(priority=1).
        DB::statement(<<<'SQL'
            INSERT INTO user_clubs (user_id, club_id, priority, created_at, updated_at)
            SELECT id, club_id, 1, NOW(), NOW()
            FROM users
            WHERE club_id IS NOT NULL
        SQL);

        // Drop de la FK + colonne users.club_id — plus de doublon source de vérité.
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('club_id');
        });
    }

    public function down(): void
    {
        // Rollback : ré-ajoute users.club_id + rapatrie le principal.
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('club_id')->nullable()->after('city')->constrained('clubs')->nullOnDelete();
        });

        DB::statement(<<<'SQL'
            UPDATE users u
            LEFT JOIN user_clubs uc ON uc.user_id = u.id AND uc.priority = 1
            SET u.club_id = uc.club_id
        SQL);

        Schema::dropIfExists('user_clubs');
    }
};
