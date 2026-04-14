<?php

namespace App\Modules\Tournament\Listeners;

use App\Jobs\GenerateMatchesJob;
use App\Modules\Tournament\Events\TournamentLaunched;
use Illuminate\Support\Facades\Log;

/**
 * Reçoit TournamentLaunched et dispatche GenerateMatchesJob (queue 'high').
 * Le Job wrappe l'appel MatchEngineService::generateInitial dans DB::transaction.
 *
 * À venir Phase 2+ :
 *   - SendConvocationsJob (notifications équipes)
 *   - SendReminderJob (24h / 1h)
 */
class GenerateMatchesListener
{
    public function handle(TournamentLaunched $event): void
    {
        Log::info('[TournamentLaunched] Dispatching GenerateMatchesJob', [
            'tournament_uuid' => $event->tournament->uuid,
            'registered_teams' => $event->tournament->registeredTeams()->count(),
            'launched_at' => $event->tournament->launched_at?->toIso8601String(),
        ]);

        GenerateMatchesJob::dispatch($event->tournament);
    }
}
