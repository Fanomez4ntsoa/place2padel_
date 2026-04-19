<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ENUM('player', 'organizer', 'referee', 'admin') → ajout 'club_owner'.
        // MODIFY COLUMN direct car Laravel ne gère pas les changements d'ENUM nativement.
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('player', 'organizer', 'referee', 'admin', 'club_owner') NOT NULL DEFAULT 'player'");
    }

    public function down(): void
    {
        // Rétablir l'ENUM sans club_owner. Les users club_owner existants deviendraient
        // invalides → on les passe en player avant le downgrade.
        DB::statement("UPDATE users SET role = 'player' WHERE role = 'club_owner'");
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('player', 'organizer', 'referee', 'admin') NOT NULL DEFAULT 'player'");
    }
};
