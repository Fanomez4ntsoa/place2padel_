<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute payment_method au tournament (on_site par défaut, online déclenche Stripe).
 * Aligné Emergent 39b6544 : l'organisateur choisit à la création.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->enum('payment_method', ['on_site', 'online'])
                ->default('on_site')
                ->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->dropColumn('payment_method');
        });
    }
};
