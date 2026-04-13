<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clubs', function (Blueprint $table) {
            // CHAR(3) : 2 chiffres métropole (01-95) + 3 chiffres DOM-TOM (971-976).
            $table->char('department', 3)->nullable()->after('postal_code');
            $table->index('department');
        });
    }

    public function down(): void
    {
        Schema::table('clubs', function (Blueprint $table) {
            $table->dropIndex(['department']);
            $table->dropColumn('department');
        });
    }
};
