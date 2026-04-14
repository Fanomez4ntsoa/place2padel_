<?php

namespace App\Jobs;

use App\Models\Tournament;
use App\Modules\Notification\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Rappel 24h ou 1h avant le tournoi. Dispatché avec ->delay() depuis le listener
 * DispatchLaunchNotifications — Redis handle le délai nativement, pas de cron.
 *
 * Guard d'exécution : si le tournoi est déjà 'completed' ou retiré, skip.
 */
class SendReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    /** @param  '24h'|'1h'  $window */
    public function __construct(
        public readonly Tournament $tournament,
        public readonly string $window,
    ) {
        $this->onQueue('default');
    }

    public function handle(NotificationService $service): void
    {
        $tournament = $this->tournament->fresh([
            'registeredTeams.captain:id,email,name',
            'registeredTeams.partner:id,email,name',
        ]);

        if (! $tournament || $tournament->status === 'completed') {
            Log::info('[SendReminderJob] Skip — tournament missing or completed', [
                'uuid' => $this->tournament->uuid,
                'window' => $this->window,
            ]);
            return;
        }

        $when = $this->window === '24h' ? 'demain' : 'dans 1 heure';
        $title = "Rappel — {$tournament->name}";
        $message = "Ton tournoi {$tournament->name} commence {$when}. Prépare ta raquette !";
        $link = "/tournois/{$tournament->uuid}";
        $data = ['tournament_uuid' => $tournament->uuid, 'window' => $this->window];

        $notified = [];
        foreach ($tournament->registeredTeams as $team) {
            foreach (array_filter([$team->captain, $team->partner]) as $player) {
                if (isset($notified[$player->id])) {
                    continue;
                }
                $service->create($player, "reminder_{$this->window}", $title, $message, $link, $data);
                $notified[$player->id] = true;
            }
        }

        Log::info('[SendReminderJob] Sent', [
            'tournament_uuid' => $tournament->uuid,
            'window' => $this->window,
            'players_notified' => count($notified),
        ]);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('[SendReminderJob] Failed', [
            'tournament_uuid' => $this->tournament->uuid,
            'window' => $this->window,
            'error' => $e->getMessage(),
        ]);
    }
}
