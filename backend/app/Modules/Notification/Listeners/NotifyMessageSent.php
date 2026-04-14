<?php

namespace App\Modules\Notification\Listeners;

use App\Models\User;
use App\Modules\Matchmaking\Events\MessageSent;
use App\Modules\Notification\Services\NotificationService;

/**
 * Notifie le destinataire (l'autre participant) qu'il a reçu un message.
 * Type 'message' → in-app only (pas dans EMAIL_TYPES) : volume élevé attendu,
 * éviter le spam email.
 */
class NotifyMessageSent
{
    public function __construct(private readonly NotificationService $service) {}

    public function handle(MessageSent $event): void
    {
        $message = $event->message->fresh(['conversation', 'sender']);
        if (! $message || ! $message->conversation || ! $message->sender) {
            return;
        }

        $otherUserId = $message->conversation->otherUserId($message->sender_id);
        if ($otherUserId === null) {
            return;
        }

        $recipient = User::find($otherUserId);
        if (! $recipient) {
            return;
        }

        $senderName = $message->sender->name ?? 'Un joueur';
        $preview = mb_strimwidth($message->text, 0, 80, '…');

        $this->service->create(
            user: $recipient,
            type: 'message',
            title: "Nouveau message — {$senderName}",
            message: $preview,
            link: "/conversations/{$message->conversation->uuid}",
            data: [
                'conversation_uuid' => $message->conversation->uuid,
                'message_uuid' => $message->uuid,
                'sender_uuid' => $message->sender->uuid,
            ],
        );
    }
}
