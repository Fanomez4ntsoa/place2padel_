<?php

namespace App\Modules\Notification\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Modules\Notification\Resources\NotificationResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;

class MarkNotificationReadController extends Controller
{
    public function __invoke(Request $request, Notification $notification): NotificationResource
    {
        if ($notification->user_id !== $request->user()->id) {
            throw new AuthorizationException('Notification appartient à un autre utilisateur.');
        }

        $notification->markAsRead();

        return new NotificationResource($notification);
    }
}
