<?php

namespace App\Modules\Notification\Listeners;

use App\Modules\Notification\Services\NotificationService;
use App\Modules\Tournament\Events\TeamPromotedFromWaitlist;

class NotifyWaitlistPromoted
{
    public function __construct(private readonly NotificationService $service) {}

    public function handle(TeamPromotedFromWaitlist $event): void
    {
        $team = $event->team->fresh(['tournament', 'captain', 'partner']);
        if (! $team || ! $team->tournament) {
            return;
        }

        $tournament = $team->tournament;
        $title = "Bonne nouvelle — {$tournament->name}";
        $message = "Une place s'est libérée et ton équipe est désormais inscrite. À toi de jouer !";
        $link = "/tournois/{$tournament->uuid}";
        $data = ['tournament_uuid' => $tournament->uuid, 'team_id' => $team->id];

        foreach (array_filter([$team->captain, $team->partner]) as $player) {
            $this->service->create($player, 'waitlist_promoted', $title, $message, $link, $data);
        }
    }
}
