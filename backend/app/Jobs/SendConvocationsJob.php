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
 * Envoie les convocations à tous les joueurs inscrits après le launch.
 *
 * Décision MVP : message générique (pas d'horaire précis ni de court).
 * L'auto-scheduling arrive en Phase 3.5 — à ce moment, ce Job pourra se baser
 * sur les matches R1 avec estimated_time + court peuplés.
 *
 * Queue 'high' — l'info "ton tournoi démarre" doit partir sans délai.
 */
class SendConvocationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public readonly Tournament $tournament)
    {
        $this->onQueue('high');
    }

    public function handle(NotificationService $service): void
    {
        $tournament = $this->tournament->fresh([
            'registeredTeams.captain:id,email,name',
            'registeredTeams.partner:id,email,name',
        ]);

        if (! $tournament) {
            Log::warning('[SendConvocationsJob] Tournament missing', [
                'uuid' => $this->tournament->uuid,
            ]);
            return;
        }

        $notified = [];
        $link = "/tournois/{$tournament->uuid}";
        $data = ['tournament_uuid' => $tournament->uuid];
        $title = "Convocation — {$tournament->name}";
        $message = "Ton tournoi {$tournament->name} vient d'être lancé. Consulte tes matchs et prépare-toi !";

        foreach ($tournament->registeredTeams as $team) {
            foreach (array_filter([$team->captain, $team->partner]) as $player) {
                if (isset($notified[$player->id])) {
                    continue; // anti-double (même joueur dans 2 rôles — improbable mais sûr).
                }
                $service->create($player, 'convocation', $title, $message, $link, $data);
                $notified[$player->id] = true;
            }
        }

        Log::info('[SendConvocationsJob] Completed', [
            'tournament_uuid' => $tournament->uuid,
            'players_notified' => count($notified),
        ]);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('[SendConvocationsJob] Failed', [
            'tournament_uuid' => $this->tournament->uuid,
            'error' => $e->getMessage(),
        ]);
    }
}
