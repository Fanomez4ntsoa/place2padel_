<?php

namespace App\Modules\Feed\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Modules\Feed\Requests\StorePostRequest;
use App\Modules\Feed\Resources\PostResource;
use App\Modules\Feed\Services\FeedService;
use Illuminate\Auth\Access\AuthorizationException;

class CreatePostController extends Controller
{
    public function __invoke(StorePostRequest $request, FeedService $feed): PostResource
    {
        $user = $request->user();
        $tournament = null;

        if ($request->filled('tournament_uuid')) {
            $tournament = Tournament::where('uuid', $request->input('tournament_uuid'))->firstOrFail();

            // Permission salon : organisateur, admin, captain ou partner d'une team registered.
            $isOrganizer = $tournament->created_by_user_id === $user->id;
            $isAdmin = $user->role === 'admin';
            $isParticipant = $tournament->registeredTeams()
                ->where(fn ($q) => $q->where('captain_id', $user->id)->orWhere('partner_id', $user->id))
                ->exists();

            if (! $isOrganizer && ! $isAdmin && ! $isParticipant) {
                throw new AuthorizationException('Seuls organisateur, admin et participants peuvent poster dans le salon.');
            }
        }

        $post = $feed->createUserPost(
            author: $user,
            text: $request->input('text'),
            imageUrl: $request->input('image_url'),
            tournament: $tournament,
        );

        return new PostResource($post->load(['author', 'tournament.club']));
    }
}
