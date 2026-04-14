<?php

namespace App\Modules\Notification\Listeners;

use App\Jobs\FanoutNotificationJob;
use App\Models\ClubSubscription;
use App\Modules\Tournament\Events\TournamentCreated;

/**
 * Diffuse "nouveau tournoi" aux abonnés du club, hors créateur.
 * Phase 4 : élargir aux joueurs matchant sur niveau + zone géographique.
 */
class NotifyNewTournament
{
    public function handle(TournamentCreated $event): void
    {
        $tournament = $event->tournament;

        $targets = ClubSubscription::where('club_id', $tournament->club_id)
            ->where('user_id', '!=', $tournament->created_by_user_id)
            ->pluck('user_id')
            ->unique()
            ->values()
            ->all();

        if (empty($targets)) {
            return;
        }

        FanoutNotificationJob::dispatch(
            userIds: $targets,
            type: 'new_tournament',
            title: "Nouveau tournoi — {$tournament->name}",
            message: "Un nouveau tournoi {$tournament->level} vient d'être créé dans ton club. Inscris-toi !",
            link: "/tournois/{$tournament->uuid}",
            data: ['tournament_uuid' => $tournament->uuid],
        );
    }
}
