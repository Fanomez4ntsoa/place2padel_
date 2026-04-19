<?php

namespace App\Modules\Notification\Listeners;

use App\Modules\Matchmaking\Events\MatchCreated;
use App\Modules\Notification\Services\NotificationService;

/**
 * Notifie les 2 participants d'un match mutuel (matching amical global).
 * In-app + email (type 'match' whitelisté dans EMAIL_TYPES).
 */
class NotifyMatchCreated
{
    public function __construct(private readonly NotificationService $service) {}

    public function handle(MatchCreated $event): void
    {
        $match = $event->match->fresh(['userA', 'userB']);
        $conversation = $event->conversation;
        if (! $match || ! $match->userA || ! $match->userB) {
            return;
        }

        $this->service->create(
            user: $match->userA,
            type: 'match',
            title: 'Nouveau match !',
            message: "{$match->userB->name} et toi avez matché ! Commence à discuter.",
            link: "/conversations/{$conversation->uuid}",
            data: [
                'match_uuid' => $match->uuid,
                'conversation_uuid' => $conversation->uuid,
                'other_user_uuid' => $match->userB->uuid,
            ],
        );

        $this->service->create(
            user: $match->userB,
            type: 'match',
            title: 'Nouveau match !',
            message: "{$match->userA->name} et toi avez matché ! Commence à discuter.",
            link: "/conversations/{$conversation->uuid}",
            data: [
                'match_uuid' => $match->uuid,
                'conversation_uuid' => $conversation->uuid,
                'other_user_uuid' => $match->userA->uuid,
            ],
        );
    }
}
