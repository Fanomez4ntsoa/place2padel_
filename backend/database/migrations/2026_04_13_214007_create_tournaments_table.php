<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tournaments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->foreignId('club_id')->constrained('clubs')->restrictOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();

            $table->string('name');
            // `location` = précision textuelle (ex: "Court 1" ou adresse différente du club principal).
            $table->string('location')->nullable();

            // 'open' = tournoi mixte sans restriction de genre.
            $table->enum('type', ['masculin', 'feminin', 'mixte', 'open']);

            // Cohérent avec user_preferred_levels (FFT).
            $table->enum('level', ['P25', 'P50', 'P100', 'P250', 'P500', 'P1000', 'P2000']);

            $table->date('date');
            $table->time('start_time')->default('09:00:00');
            $table->date('inscription_deadline')->nullable();

            $table->unsignedSmallInteger('max_teams');
            $table->unsignedSmallInteger('courts_available')->default(4);

            $table->string('price', 50)->nullable();
            $table->string('share_link', 500)->nullable();

            $table->enum('status', ['open', 'full', 'in_progress', 'completed'])->default('open');
            $table->timestamp('launched_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes pour les requêtes clés :
            // - filtres list + for-me : (status, date)
            // - jointures via Club : club_id
            // - "mes tournois" / autorisation owner : created_by_user_id
            // - filtre level standalone
            $table->index(['status', 'date']);
            $table->index('club_id');
            $table->index('created_by_user_id');
            $table->index('level');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournaments');
    }
};
