<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Capture le timestamp de démarrage d'un match de tournoi pour alimenter le
 * timer "elapsed" côté mobile (port Emergent MatchLivePage.js:26-34).
 *
 * Rempli lors de la transition `pending → in_progress` dans
 * UpdateMatchScoreController (1ère saisie de score). Nullable pour les
 * matchs pending (pas encore démarrés).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->timestamp('started_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropColumn('started_at');
        });
    }
};
