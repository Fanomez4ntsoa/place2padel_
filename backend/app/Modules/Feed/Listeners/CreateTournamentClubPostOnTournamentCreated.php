<?php

namespace App\Modules\Feed\Listeners;

use App\Models\Post;
use App\Modules\Feed\Services\FeedService;
use App\Modules\Tournament\Events\TournamentCreated;

/**
 * Port Emergent d5ac086 [server.py:506-525] `_post_tournament_to_club`.
 *
 * Si le club du tournoi a un owner_id (club revendiqué via /clubs/claim),
 * génère un 2ᵉ post système en plus du `system_new_tournament` générique.
 * Auteur = patron du club → apparaît "au nom du club" dans le feed.
 *
 * Ce listener est idempotent vis-à-vis de CreateSystemPostOnTournamentCreated :
 * les 2 posts cohabitent (type différent), l'un générique sur le feed global,
 * l'autre spécifique à la page du club.
 *
 * Architecture : écoute le même event TournamentCreated que le post générique
 * plutôt que d'injecter la logique dans CreateTournamentController — respect
 * du principe thin controllers + single responsibility.
 */
class CreateTournamentClubPostOnTournamentCreated
{
    public function __construct(private readonly FeedService $feed) {}

    public function handle(TournamentCreated $event): void
    {
        $tournament = $event->tournament->fresh(['club.owner']);

        $club = $tournament?->club;
        $owner = $club?->owner;

        // Skip silencieux si club non revendiqué (comportement Emergent identique).
        if (! $tournament || ! $club || ! $owner) {
            return;
        }

        $date = $tournament->date?->format('d/m/Y') ?? '';
        $time = $tournament->start_time ? " à {$tournament->start_time}" : '';
        $price = $tournament->price ? " — {$tournament->price}" : '';
        $maxTeams = $tournament->max_teams ?? 0;

        $text = "Tournoi {$tournament->level} dans notre club !\n"
            ."{$tournament->name} · {$date}{$time}{$price} · {$maxTeams} équipes max";

        $metadata = [
            'post_tournament_club' => [
                'club_uuid' => $club->uuid,
                'club_name' => $club->name,
                'tournament_uuid' => $tournament->uuid,
                'level' => $tournament->level,
                'date' => $tournament->date?->toDateString(),
                'start_time' => $tournament->start_time,
                'price' => $tournament->price,
                'max_teams' => $maxTeams,
            ],
        ];

        $this->feed->createSystemPost(
            type: Post::TYPE_SYSTEM_TOURNAMENT_CLUB,
            author: $owner,
            text: $text,
            tournament: $tournament,
            postType: Post::POST_TYPE_TOURNAMENT_CLUB,
            metadata: $metadata,
            aspect: Post::ASPECT_PORTRAIT,
        );
    }
}
