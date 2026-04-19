<?php

namespace App\Modules\Feed\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\Tournament;
use App\Modules\Feed\Requests\StorePostRequest;
use App\Modules\Feed\Resources\PostResource;
use App\Modules\Feed\Services\FeedService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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

        // Classification fine — réservée aux juges arbitres/admins (port
        // Emergent `/posts` server.py:3950-3952).
        $postType = null;
        if ($request->input('post_type') === Post::POST_TYPE_REFEREE_ANNOUNCEMENT) {
            if (! in_array($user->role, ['referee', 'admin'], true)) {
                throw new AuthorizationException('Seuls juges arbitres et admins peuvent publier une annonce.');
            }
            $postType = Post::POST_TYPE_REFEREE_ANNOUNCEMENT;
        }

        // Upload multipart prioritaire sur image_url (URL précalculée).
        // Le path brut est converti en URL absolue avant insertion pour que
        // PostResource puisse servir l'image_url directement sans accessor.
        $imageUrl = $request->input('image_url');
        if ($request->hasFile('image')) {
            $disk = Storage::disk(config('filesystems.avatars', 's3'));
            $file = $request->file('image');
            $filename = Str::random(32).'.'.$file->getClientOriginalExtension();
            $path = "posts/{$user->uuid}/{$filename}";
            $disk->putFileAs(dirname($path), $file, basename($path), 'public');
            $imageUrl = $disk->url($path);
        }

        $post = $feed->createUserPost(
            author: $user,
            text: $request->input('text'),
            imageUrl: $imageUrl,
            tournament: $tournament,
            postType: $postType,
        );

        return new PostResource($post->load(['author', 'tournament.club']));
    }
}
