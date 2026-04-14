<?php

namespace App\Modules\Notification\Listeners;

use App\Jobs\FanoutNotificationJob;
use App\Models\ClubSubscription;
use App\Models\Notification;
use App\Modules\Notification\Services\NotificationService;
use App\Modules\Tournament\Events\TeamRegistered;

/**
 * Deux responsabilités :
 *   1. Notifier le captain (+ partner) de son inscription / passage en waitlist.
 *   2. Vérifier si le tournoi vient de franchir un seuil 50/90/100% → fanout
 *      aux abonnés du club.
 *
 * Anti-doublon milestones : on interroge la table notifications pour savoir
 * si un milestone du même type a déjà été créé pour ce tournoi (via data JSON).
 * Évite une table `tournament_milestones` dédiée — 1 requête indexée par check.
 */
class NotifyTeamRegistered
{
    public function __construct(private readonly NotificationService $service) {}

    public function handle(TeamRegistered $event): void
    {
        $team = $event->team->fresh(['tournament', 'captain', 'partner']);
        if (! $team || ! $team->tournament) {
            return;
        }

        $tournament = $team->tournament;
        $isWaitlisted = $team->status === 'waitlisted';
        $type = $isWaitlisted ? 'waitlist' : 'registration';
        $title = $isWaitlisted
            ? "Liste d'attente — {$tournament->name}"
            : "Inscription confirmée — {$tournament->name}";
        $message = $isWaitlisted
            ? "Ton équipe est en liste d'attente. Tu seras notifié si une place se libère."
            : "Ton équipe est inscrite. Rendez-vous le {$tournament->date->format('d/m/Y')} !";
        $link = "/tournois/{$tournament->uuid}";
        $data = ['tournament_uuid' => $tournament->uuid, 'team_id' => $team->id];

        foreach (array_filter([$team->captain, $team->partner]) as $player) {
            $this->service->create($player, $type, $title, $message, $link, $data);
        }

        if (! $isWaitlisted) {
            $this->checkMilestones($tournament);
        }
    }

    /**
     * Vérifie les seuils 50/90/100% et dispatche un FanoutNotificationJob si
     * un nouveau seuil vient d'être franchi ET qu'il n'a jamais été émis.
     */
    private function checkMilestones(\App\Models\Tournament $tournament): void
    {
        $registeredCount = $tournament->registeredTeams()->count();
        $max = $tournament->max_teams;
        if ($max === 0) {
            return;
        }
        $pct = ($registeredCount / $max) * 100;

        $milestone = match (true) {
            $pct >= 100 => ['type' => 'tournament_full', 'title' => "Complet — {$tournament->name}",
                'message' => 'Le tournoi est plein. Les inscriptions sont closes.'],
            $pct >= 90 => ['type' => 'milestone_90', 'title' => "Dernières places — {$tournament->name}",
                'message' => 'Plus que quelques places disponibles, dépêche-toi !'],
            $pct >= 50 => ['type' => 'milestone_50', 'title' => "50% atteint — {$tournament->name}",
                'message' => 'Le tournoi se remplit — inscris-toi avant qu\'il soit complet.'],
            default => null,
        };
        if ($milestone === null) {
            return;
        }

        $alreadySent = Notification::where('type', $milestone['type'])
            ->whereJsonContains('data->tournament_uuid', $tournament->uuid)
            ->exists();
        if ($alreadySent) {
            return;
        }

        // Destinataires : abonnés du club, hors joueurs déjà inscrits au tournoi.
        $alreadyInTournament = $tournament->teams()
            ->pluck('captain_id')
            ->merge($tournament->teams()->pluck('partner_id'))
            ->filter()
            ->unique()
            ->all();

        $targets = ClubSubscription::where('club_id', $tournament->club_id)
            ->whereNotIn('user_id', $alreadyInTournament)
            ->pluck('user_id')
            ->unique()
            ->values()
            ->all();

        if (empty($targets)) {
            return;
        }

        FanoutNotificationJob::dispatch(
            userIds: $targets,
            type: $milestone['type'],
            title: $milestone['title'],
            message: $milestone['message'],
            link: "/tournois/{$tournament->uuid}",
            data: ['tournament_uuid' => $tournament->uuid],
        );
    }
}
