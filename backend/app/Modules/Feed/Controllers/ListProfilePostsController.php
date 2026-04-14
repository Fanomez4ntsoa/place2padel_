<?php

namespace App\Modules\Feed\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Feed\Resources\PostResource;
use App\Modules\Feed\Services\FeedService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Posts d'un user sur son propre profil (tournament_id null) OU tous ses posts.
 * Décision produit : afficher uniquement les posts "libres" (sans tournoi), pour
 * garder le fil profil lisible — les posts salon restent côté salon.
 */
class ListProfilePostsController extends Controller
{
    public function __invoke(Request $request, User $user, FeedService $feed): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $paginator = $user->posts()
            ->whereNull('tournament_id')
            ->with(['author:id,uuid,name,picture_url'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(perPage: $validated['per_page'] ?? 20, page: $validated['page'] ?? 1);

        $feed->attachViewerLikes($paginator->items(), auth('sanctum')->user());

        return PostResource::collection($paginator);
    }
}
