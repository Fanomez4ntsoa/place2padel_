<?php

namespace App\Modules\Feed\Listeners;

use App\Models\Post;
use App\Modules\Feed\Services\FeedService;
use App\Modules\Tournament\Events\TournamentCompleted;
use Illuminate\Support\Facades\Log;

/**
 * Post système 'system_result' à la fin d'un tournoi.
 * Phase 5.2+ : enrichir avec nom du vainqueur (via TeamState final_position=1).
 */
class CreateSystemPostOnTournamentCompleted
{
    public function __construct(private readonly FeedService $feed) {}

    public function handle(TournamentCompleted $event): void
    {
        $tournament = $event->tournament->fresh('creator');
        if (! $tournament || ! $tournament->creator) {
            Log::warning('[Feed] TournamentCompleted sans creator — skip', [
                'uuid' => $event->tournament->uuid,
            ]);
            return;
        }

        $text = "Tournoi {$tournament->name} terminé. Classement final disponible.";

        $this->feed->createSystemPost(
            type: Post::TYPE_SYSTEM_RESULT,
            tournament: $tournament,
            author: $tournament->creator,
            text: $text,
        );
    }
}
