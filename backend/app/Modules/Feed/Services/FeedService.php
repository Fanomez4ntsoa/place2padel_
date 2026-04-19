<?php

namespace App\Modules\Feed\Services;

use App\Models\ClubSubscription;
use App\Models\Post;
use App\Models\PostComment;
use App\Models\PostLike;
use App\Models\Tournament;
use App\Models\TournamentTeam;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class FeedService
{
    public const FILTER_ALL = 'all';
    public const FILTER_MY_TOURNAMENTS = 'my-tournaments';
    public const FILTER_MY_PARTNERS = 'my-partners';
    public const FILTER_MY_CLUBS = 'my-clubs';

    // ---------------------------------------------------------------------
    // Feed — listing avec filtres
    // ---------------------------------------------------------------------

    /**
     * Feed principal de l'user, avec filtre. Paginé page-based.
     * Eager-load auteur + tournoi + club pour éviter N+1 à la sérialisation.
     */
    public function feedForUser(User $viewer, string $filter, int $page = 1, int $perPage = 20): LengthAwarePaginator
    {
        $query = Post::query()
            ->with(['author:id,uuid,name,picture_url', 'tournament:id,uuid,name,club_id', 'tournament.club:id,name,city'])
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        $this->applyFilter($query, $viewer, $filter);

        return $query->paginate(perPage: $perPage, page: $page);
    }

    // ---------------------------------------------------------------------
    // Création de posts
    // ---------------------------------------------------------------------

    public function createUserPost(
        User $author,
        ?string $text,
        ?string $imageUrl,
        ?Tournament $tournament,
        ?string $postType = null,
    ): Post {
        return Post::create([
            'author_id' => $author->id,
            'type' => Post::TYPE_USER,
            'post_type' => $postType,
            'text' => $text,
            'image_url' => $imageUrl,
            'tournament_id' => $tournament?->id,
        ]);
    }

    /**
     * Post système — créé par les listeners (TournamentCreated / Completed,
     * UserRegistered, FriendlyMatchCompleted…).
     *
     * - `$type` = coarse category (system_* | user) utilisée par le FeedService.
     * - `$postType` = fine classification Emergent-compatible (new_player,
     *   match_result…) utilisée pour l'affichage côté mobile.
     * - `$metadata` = payload JSON libre dépendant du post_type
     *   (post_player_info, post_match_info, …).
     * - `$aspect` = hint ratio image côté UI.
     *
     * `$tournament` et `$imageUrl` restent optionnels (welcome post + match
     * amical n'ont pas de tournoi / d'image initiale).
     *
     * @param  array<string,mixed>|null  $metadata
     */
    public function createSystemPost(
        string $type,
        User $author,
        string $text,
        ?Tournament $tournament = null,
        ?string $postType = null,
        ?array $metadata = null,
        ?string $aspect = null,
        ?string $imageUrl = null,
    ): Post {
        return Post::create([
            'author_id' => $author->id,
            'type' => $type,
            'post_type' => $postType,
            'text' => $text,
            'image_url' => $imageUrl,
            'metadata' => $metadata,
            'post_aspect' => $aspect,
            'tournament_id' => $tournament?->id,
        ]);
    }

    // ---------------------------------------------------------------------
    // Likes
    // ---------------------------------------------------------------------

    /**
     * Toggle like/unlike. Maintient likes_count transactionnellement.
     * Retourne l'état final + compteur frais.
     *
     * @return array{liked: bool, likes_count: int}
     */
    public function toggleLike(Post $post, User $user): array
    {
        $existing = PostLike::where('post_id', $post->id)->where('user_id', $user->id)->first();

        DB::transaction(function () use ($existing, $post, $user) {
            if ($existing) {
                $existing->delete();
                $post->decrement('likes_count');
            } else {
                PostLike::create(['post_id' => $post->id, 'user_id' => $user->id]);
                $post->increment('likes_count');
            }
        });

        return [
            'liked' => $existing === null,
            'likes_count' => $post->fresh()->likes_count,
        ];
    }

    // ---------------------------------------------------------------------
    // Comments
    // ---------------------------------------------------------------------

    /**
     * Ajoute un commentaire + incrémente comments_count en transaction
     * (corrige le bug Emergent qui ne synchronisait jamais le compteur).
     */
    public function addComment(Post $post, User $user, string $text): PostComment
    {
        return DB::transaction(function () use ($post, $user, $text) {
            $comment = PostComment::create([
                'post_id' => $post->id,
                'user_id' => $user->id,
                'text' => $text,
            ]);
            $post->increment('comments_count');
            return $comment;
        });
    }

    /**
     * Injecte liked_by_viewer (bool) sur chaque Post via 1 seule query groupée.
     * Évite le N+1 classique sur une page de feed.
     *
     * @param  iterable<Post>  $posts
     */
    public function attachViewerLikes(iterable $posts, ?User $viewer): void
    {
        if (! $viewer) {
            foreach ($posts as $p) {
                $p->setAttribute('liked_by_viewer', false);
            }
            return;
        }

        $postIds = [];
        foreach ($posts as $p) {
            $postIds[] = $p->id;
        }
        if (empty($postIds)) {
            return;
        }

        $likedIds = PostLike::query()
            ->whereIn('post_id', $postIds)
            ->where('user_id', $viewer->id)
            ->pluck('post_id')
            ->all();
        $likedSet = array_flip($likedIds);

        foreach ($posts as $p) {
            $p->setAttribute('liked_by_viewer', isset($likedSet[$p->id]));
        }
    }

    public function deleteComment(PostComment $comment): void
    {
        DB::transaction(function () use ($comment) {
            $post = $comment->post;
            $comment->delete();
            $post?->decrement('comments_count');
        });
    }

    // ---------------------------------------------------------------------
    // Helpers privés
    // ---------------------------------------------------------------------

    private function applyFilter(Builder $query, User $viewer, string $filter): void
    {
        match ($filter) {
            self::FILTER_MY_TOURNAMENTS => $this->filterMyTournaments($query, $viewer),
            self::FILTER_MY_PARTNERS => $this->filterMyPartners($query, $viewer),
            self::FILTER_MY_CLUBS => $this->filterMyClubs($query, $viewer),
            default => null, // FILTER_ALL ou inconnu → pas de filtre.
        };
    }

    /**
     * Posts liés aux tournois où le viewer est inscrit (captain ou partner).
     */
    private function filterMyTournaments(Builder $query, User $viewer): void
    {
        $tournamentIds = TournamentTeam::query()
            ->where(fn ($q) => $q->where('captain_id', $viewer->id)->orWhere('partner_id', $viewer->id))
            ->pluck('tournament_id')
            ->unique()
            ->all();

        $query->whereIn('tournament_id', $tournamentIds ?: [-1]);
    }

    /**
     * Posts dont l'author est un ancien équipier (décision #1 : auteur in ids).
     */
    private function filterMyPartners(Builder $query, User $viewer): void
    {
        $ids = $this->myPartnersIds($viewer);
        $query->whereIn('author_id', $ids ?: [-1]);
    }

    /**
     * Posts liés à des tournois de clubs auxquels le viewer est abonné.
     */
    private function filterMyClubs(Builder $query, User $viewer): void
    {
        $clubIds = ClubSubscription::where('user_id', $viewer->id)
            ->pluck('club_id')
            ->all();

        $query->whereHas('tournament', fn ($q) => $q->whereIn('club_id', $clubIds ?: [-1]));
    }

    /**
     * IDs des users ayant été captain OU partner du viewer dans un tournoi passé.
     * Exclut le viewer lui-même. Extrait du couple complémentaire sur tournament_teams.
     *
     * @return list<int>
     */
    private function myPartnersIds(User $viewer): array
    {
        $teams = TournamentTeam::query()
            ->where(fn ($q) => $q->where('captain_id', $viewer->id)->orWhere('partner_id', $viewer->id))
            ->get(['captain_id', 'partner_id']);

        return $teams
            ->flatMap(fn ($t) => [$t->captain_id, $t->partner_id])
            ->filter(fn ($id) => $id !== null && $id !== $viewer->id)
            ->unique()
            ->values()
            ->all();
    }
}
