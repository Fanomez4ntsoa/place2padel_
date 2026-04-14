<?php

namespace App\Jobs;

use App\Models\User;
use App\Modules\Notification\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Dispatch groupé : un seul Job itère sur N destinataires (décision archi #3).
 * Évite le pattern "N jobs individuels" qui saturerait la queue pour un tournoi
 * avec 100+ abonnés club.
 *
 * Le payload porte des user_ids (int[]) plutôt que des User models — plus léger
 * à sérialiser et on recharge frais au moment de l'exécution (un user peut
 * avoir été supprimé entre dispatch et handle).
 *
 * Queue 'high' : les fanouts portent des signaux métier visibles (milestones,
 * annonces) qu'on veut voir partir sans délai.
 */
class FanoutNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    /**
     * @param  list<int>  $userIds  Destinataires (ids numériques).
     * @param  array<string,mixed>|null  $data  Payload structuré pour le front.
     */
    public function __construct(
        public readonly array $userIds,
        public readonly string $type,
        public readonly string $title,
        public readonly string $message,
        public readonly ?string $link = null,
        public readonly ?array $data = null,
    ) {
        $this->onQueue('high');
    }

    public function handle(NotificationService $service): void
    {
        if (empty($this->userIds)) {
            return;
        }

        // Charge en un coup — évite N+1, permet de filtrer les users supprimés.
        $users = User::query()->whereIn('id', $this->userIds)->get();

        foreach ($users as $user) {
            $service->create(
                user: $user,
                type: $this->type,
                title: $this->title,
                message: $this->message,
                link: $this->link,
                data: $this->data,
            );
        }

        Log::info('[FanoutNotificationJob] Completed', [
            'type' => $this->type,
            'targets' => count($this->userIds),
            'delivered' => $users->count(),
        ]);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('[FanoutNotificationJob] Failed', [
            'type' => $this->type,
            'targets' => count($this->userIds),
            'error' => $e->getMessage(),
        ]);
    }
}
