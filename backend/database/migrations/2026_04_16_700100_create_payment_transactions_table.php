<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('tournament_id')->constrained('tournaments')->cascadeOnDelete();

            // Stripe identifiers.
            $table->string('session_id')->unique(); // cs_test_xxxx
            $table->string('payment_intent_id')->nullable();

            // Montant en centimes (Stripe).
            $table->unsignedInteger('amount_cents');
            $table->string('currency', 3)->default('EUR');

            // Statut synchronisé avec Stripe.
            $table->enum('status', ['pending', 'paid', 'failed', 'expired', 'cancelled'])
                ->default('pending');

            // URL de retour Stripe.
            $table->string('success_url')->nullable();
            $table->string('cancel_url')->nullable();

            $table->timestamp('completed_at')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'tournament_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
    }
};
