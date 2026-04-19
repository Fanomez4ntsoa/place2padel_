<?php

namespace App\Modules\Feed\Listeners;

use App\Models\Post;
use App\Modules\Auth\Events\UserRegistered;
use App\Modules\Feed\Services\FeedService;

/**
 * Port Emergent d5ac086 [server.py:287-318] : welcome post automatique
 * à l'inscription. Auteur = l'user lui-même (coherent avec la perception
 * "{nom} rejoint PlaceToPadel !").
 *
 * post_type :
 *   - 'new_competitor' si license_number renseigné (le FFT sync peut
 *     arriver plus tard via DispatchFFTSync → pas encore de padel_points).
 *   - 'new_player' sinon.
 *
 * Aspect square (format Emergent). Image vide → backfill par
 * ProfileService::updatePhoto à la 1ère photo uploadée.
 */
class CreateWelcomePostOnUserRegistered
{
    public function __construct(private readonly FeedService $feed) {}

    public function handle(UserRegistered $event): void
    {
        $user = $event->user->fresh(['profile', 'clubs.club']);

        if (! $user) {
            return;
        }

        $isCompetitor = ! empty($user->profile?->license_number);
        $postType = $isCompetitor
            ? Post::POST_TYPE_NEW_COMPETITOR
            : Post::POST_TYPE_NEW_PLAYER;

        $intro = $isCompetitor
            ? "Nouveau compétiteur · {$user->name} rejoint PlaceToPadel !"
            : "Nouveau joueur · {$user->name} rejoint PlaceToPadel !";

        // post_player_info — payload Emergent compatible, lisible côté mobile.
        $metadata = [
            'post_player_info' => [
                'club' => $user->clubs->first()?->club?->name,
                'city' => $user->city,
                'position' => $user->profile?->position,
                'padel_level' => $user->profile?->padel_level,
                'ranking' => $user->profile?->ranking,
                'padel_points' => $user->profile?->padel_points,
                'bio' => $user->profile?->bio,
            ],
        ];

        $this->feed->createSystemPost(
            type: Post::TYPE_SYSTEM_WELCOME,
            author: $user,
            text: $intro,
            postType: $postType,
            metadata: $metadata,
            aspect: Post::ASPECT_SQUARE,
        );
    }
}
