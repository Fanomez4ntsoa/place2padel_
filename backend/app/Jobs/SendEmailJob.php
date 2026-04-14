<?php

namespace App\Jobs;

use App\Mail\NotificationMail;
use App\Models\Notification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Envoie l'email correspondant à une Notification in-app (whitelist EMAIL_TYPES).
 * Queue 'default', tries=3 avec backoff exponentiel — Resend peut avoir des
 * downtimes transitoires mais on n'insiste pas indéfiniment.
 *
 * Skip silencieux si l'user a été supprimé entre la création de la notif et
 * l'exécution du Job — cascadeOnDelete sur notifications couvre ce cas.
 */
class SendEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [10, 60, 300];

    public function __construct(public readonly Notification $notification)
    {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        $notification = $this->notification->fresh('user');
        if (! $notification || ! $notification->user || ! $notification->user->email) {
            Log::info('[SendEmailJob] Notification or user missing/email empty — skip', [
                'notification_uuid' => $this->notification->uuid,
            ]);
            return;
        }

        Mail::to($notification->user->email)
            ->send(new NotificationMail($notification));
    }

    public function failed(\Throwable $e): void
    {
        Log::error('[SendEmailJob] Failed', [
            'notification_uuid' => $this->notification->uuid,
            'error' => $e->getMessage(),
        ]);
    }
}
