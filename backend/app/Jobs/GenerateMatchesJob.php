<?php

namespace App\Jobs;

use App\Models\Tournament;
use App\Modules\Tournament\Services\MatchEngineService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Génère la structure initiale du tournoi après launch.
 * Queue 'high' (cf. config/horizon.php) — bloquant pour l'UX : les organisateurs
 * attendent l'affichage des poules/matchs dès le clic "Lancer".
 *
 * Transaction obligatoire autour de generateInitial (cf. archi étape 3 point 1).
 *
 * Idempotence : MatchEngineService::generateInitial throw LogicException si des
 * matchs existent déjà — un retry après succès partiel échouera proprement.
 */
class GenerateMatchesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 10;

    public function __construct(public readonly Tournament $tournament)
    {
        $this->onQueue('high');
    }

    public function handle(MatchEngineService $engine): void
    {
        $tournament = $this->tournament->fresh();

        if (! $tournament) {
            Log::warning('[GenerateMatchesJob] Tournament missing', [
                'tournament_uuid' => $this->tournament->uuid,
            ]);
            return;
        }

        DB::transaction(function () use ($engine, $tournament) {
            $engine->generateInitial($tournament);
        });
    }

    public function failed(\Throwable $e): void
    {
        Log::error('[GenerateMatchesJob] Failed', [
            'tournament_uuid' => $this->tournament->uuid,
            'error' => $e->getMessage(),
        ]);
    }
}
