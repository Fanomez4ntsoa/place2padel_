<?php

namespace App\Modules\Notification\Listeners;

use App\Modules\Matchmaking\Events\ProposalCreated;
use App\Modules\Notification\Services\NotificationService;

/**
 * Notifie le destinataire d'une proposal tournament_partner (email + in-app).
 * Phase 4.2 : étendre pour les types match_amical / tournament (notif simple).
 */
class NotifyProposalCreated
{
    public function __construct(private readonly NotificationService $service) {}

    public function handle(ProposalCreated $event): void
    {
        $proposal = $event->proposal->fresh(['fromUser', 'toUser', 'tournament']);
        if (! $proposal || ! $proposal->toUser || ! $proposal->tournament) {
            return;
        }

        $fromName = $proposal->fromUser?->name ?? 'Un joueur';
        $this->service->create(
            user: $proposal->toUser,
            type: 'tournament_partner',
            title: "Proposition de partenariat — {$proposal->tournament->name}",
            message: "{$fromName} te propose de jouer en équipe sur ce tournoi.",
            link: "/propositions/{$proposal->uuid}",
            data: [
                'proposal_uuid' => $proposal->uuid,
                'tournament_uuid' => $proposal->tournament->uuid,
                'from_user_uuid' => $proposal->fromUser?->uuid,
            ],
        );
    }
}
