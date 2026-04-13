<?php

namespace App\Modules\Tournament\Listeners;

use App\Modules\Tournament\Events\TournamentLaunched;
use Illuminate\Support\Facades\Log;

/**
 * STUB Phase 1.
 *
 * À remplacer en Phase 2 par un vrai listener qui appelle :
 *   - MatchEngineService::generate($tournament)  → pools / brackets / seeds
 *   - ScheduleMatchesService::plan($tournament)  → courts + horaires
 *   - SendConvocationsJob::dispatch($tournament) → notifications joueurs
 *   - SendReminderJob::schedule($tournament)     → rappels 24h / 1h
 */
class GenerateMatchesListener
{
    public function handle(TournamentLaunched $event): void
    {
        Log::info('[TournamentLaunched] Phase 2 stub — would generate matches.', [
            'tournament_uuid' => $event->tournament->uuid,
            'registered_teams' => $event->tournament->registeredTeams()->count(),
            'launched_at' => $event->tournament->launched_at?->toIso8601String(),
        ]);
    }
}
