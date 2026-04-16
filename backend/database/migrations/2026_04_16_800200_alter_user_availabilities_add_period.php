<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute la granularité matin/après-midi/soir aux user_availabilities.
 *
 * Alignement Emergent 39b6544 ProfilePage.js : 10 slots préset au lieu d'un
 * simple jour. Le slot "Flexible" = day_of_week NULL + period 'all', matche
 * tout côté MatchmakingService.
 *
 * Les 9 autres slots se mappent :
 *   Lundi/Mardi/Mercredi/Jeudi/Vendredi soir → day 1..5, period 'evening'
 *   Samedi matin/après-midi                  → day 6, period 'morning'/'afternoon'
 *   Dimanche matin/après-midi                → day 7, period 'morning'/'afternoon'
 *
 * Ordre d'opérations : drop la FK user_id AVANT l'UNIQUE composite, sinon
 * InnoDB refuse (l'index composite satisfaisait la contrainte FK sur user_id).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_availabilities', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropUnique(['user_id', 'day_of_week']);
        });

        DB::statement('ALTER TABLE user_availabilities MODIFY day_of_week TINYINT UNSIGNED NULL');

        Schema::table('user_availabilities', function (Blueprint $table) {
            $table->enum('period', ['morning', 'afternoon', 'evening', 'all'])
                ->default('all')
                ->after('day_of_week');
            $table->unique(['user_id', 'day_of_week', 'period'], 'user_avail_user_day_period_unique');
            $table->index(['user_id', 'day_of_week'], 'user_avail_user_day_idx');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        DB::statement("UPDATE user_availabilities SET period = 'all' WHERE period = ''");
    }

    public function down(): void
    {
        DB::statement('DELETE FROM user_availabilities WHERE day_of_week IS NULL');

        Schema::table('user_availabilities', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropIndex('user_avail_user_day_idx');
            $table->dropUnique('user_avail_user_day_period_unique');
            $table->dropColumn('period');
        });

        DB::statement('ALTER TABLE user_availabilities MODIFY day_of_week TINYINT UNSIGNED NOT NULL');

        Schema::table('user_availabilities', function (Blueprint $table) {
            $table->unique(['user_id', 'day_of_week']);
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};
