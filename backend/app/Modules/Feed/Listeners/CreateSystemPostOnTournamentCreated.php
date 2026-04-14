<?php

namespace App\Modules\Feed\Listeners;

use App\Models\Post;
use App\Modules\Feed\Services\FeedService;
use App\Modules\Tournament\Events\TournamentCreated;
use Illuminate\Support\Facades\Log;

/**
 * Crée un post système 'system_new_tournament' dès qu'un tournoi est créé.
 * Author = créateur du tournoi (author_id NOT NULL par convention).
 */
class CreateSystemPostOnTournamentCreated
{
    public function __construct(private readonly FeedService $feed) {}

    public function handle(TournamentCreated $event): void
    {
        $tournament = $event->tournament->fresh(['creator', 'club']);
        if (! $tournament || ! $tournament->creator) {
            Log::warning('[Feed] TournamentCreated sans creator — skip', [
                'uuid' => $event->tournament->uuid,
            ]);
            return;
        }

        $clubLabel = $tournament->club?->name ?? 'club à préciser';
        $date = $tournament->date?->format('d/m/Y') ?? '';

        $text = "Nouveau tournoi : {$tournament->name} ({$tournament->level}) au {$clubLabel} le {$date}.";

        $this->feed->createSystemPost(
            type: Post::TYPE_SYSTEM_NEW_TOURNAMENT,
            tournament: $tournament,
            author: $tournament->creator,
            text: $text,
        );
    }
}
