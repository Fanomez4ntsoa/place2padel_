<?php

namespace App\Modules\Notification\Listeners;

use App\Models\Proposal;
use App\Modules\Matchmaking\Events\ProposalResponded;
use App\Modules\Notification\Services\NotificationService;

/**
 * Notifie le proposeur de la réponse (acceptée ou refusée) — email + in-app.
 */
class NotifyProposalResponded
{
    public function __construct(private readonly NotificationService $service) {}

    public function handle(ProposalResponded $event): void
    {
        $proposal = $event->proposal->fresh(['fromUser', 'toUser', 'tournament']);
        if (! $proposal || ! $proposal->fromUser) {
            return;
        }

        $accepted = $event->response === Proposal::STATUS_ACCEPTED;
        $responderName = $proposal->toUser?->name ?? 'Le joueur';
        $tournamentName = $proposal->tournament?->name ?? 'tournoi';

        $title = $accepted
            ? "Proposition acceptée — {$tournamentName}"
            : "Proposition refusée — {$tournamentName}";
        $message = $accepted
            ? "{$responderName} a accepté. Contactez-vous pour finaliser l'inscription."
            : "{$responderName} n'a pas retenu ta proposition.";

        $this->service->create(
            user: $proposal->fromUser,
            type: 'proposal_response',
            title: $title,
            message: $message,
            link: "/propositions/{$proposal->uuid}",
            data: [
                'proposal_uuid' => $proposal->uuid,
                'tournament_uuid' => $proposal->tournament?->uuid,
                'response' => $event->response,
            ],
        );
    }
}
