<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Stub Phase 3 — endpoints /push/* créent/suppriment des lignes ici
        // mais le service d'envoi Web Push réel arrive en Phase 4.
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // endpoint : URL unique fournie par le navigateur (push service). UNIQUE car
            // une même souscription ne doit pas être dupliquée (upsert sur collision).
            $table->string('endpoint', 500)->unique();
            // Clés publiques de chiffrement (VAPID / ECDH) — fournies par le navigateur.
            $table->string('p256dh', 255);
            $table->string('auth', 255);

            $table->timestamps();

            // Requête principale : charger toutes les subs d'un user avant envoi push.
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
