<?php

namespace App\Modules\Notification\Listeners;

use App\Jobs\SendConvocationsJob;
use App\Jobs\SendReminderJob;
use App\Modules\Tournament\Events\TournamentLaunched;
use Carbon\Carbon;

/**
 * Au launch :
 *   - SendConvocationsJob immédiatement (queue high).
 *   - SendReminderJob avec ->delay() à -24h et -1h avant le début.
 *     Si le launch arrive déjà <24h (ou <1h) avant le début, le rappel
 *     correspondant est skippé (délai négatif → inutile).
 *
 * start_time stocké en TIME → combiné à la date via Carbon pour obtenir un
 * instant précis. Timezone = app timezone (UTC par défaut Laravel).
 */
class DispatchLaunchNotifications
{
    public function handle(TournamentLaunched $event): void
    {
        $tournament = $event->tournament;

        SendConvocationsJob::dispatch($tournament);

        $start = $this->tournamentStart($tournament);
        $now = Carbon::now();

        $reminder24h = $start->copy()->subHours(24);
        if ($reminder24h->gt($now)) {
            SendReminderJob::dispatch($tournament, '24h')->delay($reminder24h);
        }

        $reminder1h = $start->copy()->subHour();
        if ($reminder1h->gt($now)) {
            SendReminderJob::dispatch($tournament, '1h')->delay($reminder1h);
        }
    }

    private function tournamentStart(\App\Models\Tournament $t): Carbon
    {
        // $t->date est Carbon (cast date). On fusionne avec start_time (chaîne 'HH:MM:SS').
        $time = $t->start_time ?: '09:00:00';
        return Carbon::parse($t->date->format('Y-m-d').' '.$time);
    }
}
