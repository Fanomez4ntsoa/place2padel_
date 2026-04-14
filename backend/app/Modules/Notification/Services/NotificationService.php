<?php

namespace App\Modules\Notification\Services;

use App\Jobs\SendEmailJob;
use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    /**
     * Types qui déclenchent un email en plus de l'in-app (whitelist Emergent).
     * Tout autre type → in-app uniquement.
     */
    public const EMAIL_TYPES = [
        'registration',
        'waitlist_promoted',
        'new_tournament',
        'milestone_50',
        'milestone_90',
        'tournament_full',
        'tournament_complete',
    ];

    /**
     * Crée une notification in-app (DB) et dispatche un SendEmailJob async si
     * le type est whitelisté. Ne fait pas de push Web (stub Phase 4).
     *
     * Retourne la notification créée — utile pour tests et pour que le caller
     * puisse référencer l'id.
     */
    public function create(
        User $user,
        string $type,
        string $title,
        string $message,
        ?string $link = null,
        ?array $data = null,
    ): Notification {
        $notification = Notification::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'link' => $link,
            'data' => $data,
        ]);

        if (in_array($type, self::EMAIL_TYPES, true) && $user->email) {
            SendEmailJob::dispatch($notification);
        }

        return $notification;
    }
}
