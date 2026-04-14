<?php

namespace App\Modules\Notification\Listeners;

use App\Jobs\FanoutNotificationJob;
use App\Modules\Tournament\Events\TournamentCompleted;

/**
 * Annonce fin de tournoi à tous les participants (captain + partner).
 * Contenu minimaliste : redirection vers la page classement côté front.
 */
class NotifyTournamentCompleted
{
    public function handle(TournamentCompleted $event): void
    {
        $tournament = $event->tournament->fresh('registeredTeams');
        if (! $tournament) {
            return;
        }

        $targets = $tournament->registeredTeams
            ->flatMap(fn ($team) => [$team->captain_id, $team->partner_id])
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (empty($targets)) {
            return;
        }

        FanoutNotificationJob::dispatch(
            userIds: $targets,
            type: 'tournament_complete',
            title: "Classement — {$tournament->name}",
            message: 'Le tournoi est terminé. Découvre le classement final !',
            link: "/tournois/{$tournament->uuid}/classement",
            data: ['tournament_uuid' => $tournament->uuid],
        );
    }
}
