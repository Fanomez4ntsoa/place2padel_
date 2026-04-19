<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Aligne la table `posts` sur la taxonomie Emergent d5ac086 :
 *  - `post_type`   : classification fine (new_player, match_result,
 *                    tournament_club, referee_announcement, new_competitor, …).
 *  - `metadata`    : payload JSON libre (post_player_info, post_match_info,
 *                    post_honour_data selon post_type).
 *  - `post_aspect` : hint ratio d'affichage image côté front
 *                    (square 1:1, portrait 4/5, landscape 16/9).
 *
 * La colonne `type` existante (ENUM coarse : user | system_*) est conservée
 * pour la filtration dans le FeedService. On la bascule en VARCHAR(50) pour
 * pouvoir y ajouter librement de nouvelles valeurs sans altérer l'ENUM
 * (nouveaux system_* pour welcome / result_friendly / tournament_club).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            // Coarse category, extensible en VARCHAR (évite les migrations
            // à chaque nouveau type system_*).
            $table->string('type', 50)->default('user')->change();

            // Classification fine Emergent-compatible. Nullable pour les
            // posts existants (backfill non bloquant).
            $table->string('post_type', 50)->nullable()->after('type');

            // Payload libre selon post_type. Non typé pour rester extensible.
            $table->json('metadata')->nullable()->after('image_url');

            // Hint d'affichage. Null = ratio par défaut côté front (4/5).
            $table->enum('post_aspect', ['square', 'portrait', 'landscape'])
                ->nullable()
                ->default(null)
                ->after('metadata');

            $table->index('post_type');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropIndex(['post_type']);
            $table->dropColumn(['post_type', 'metadata', 'post_aspect']);
            // Revert type → ENUM d'origine (Laravel 13 change() natif).
            $table->enum('type', ['user', 'system_new_tournament', 'system_result'])
                ->default('user')
                ->change();
        });
    }
};
