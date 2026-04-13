<?php

namespace App\Modules\Auth\Listeners;

use App\Modules\Auth\Events\UserRegistered;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

class SendWelcomeEmail implements ShouldQueue
{
    public string $queue = 'default';

    public function handle(UserRegistered $event): void
    {
        // TODO : implémenter Mailable WelcomeEmail (driver Resend, config MAIL_MAILER=resend).
        //   Mail::to($event->user)->send(new WelcomeEmail($event->user));
        Log::info('[SendWelcomeEmail] Would send welcome email', [
            'user_uuid' => $event->user->uuid,
            'email' => $event->user->email,
        ]);
    }
}
