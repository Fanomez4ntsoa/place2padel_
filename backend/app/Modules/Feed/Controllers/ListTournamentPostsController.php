<?php

namespace App\Modules\Feed\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Modules\Feed\Resources\PostResource;
use App\Modules\Feed\Services\FeedService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Salon d'un tournoi — posts rattachés à ce tournoi. Auth optionnelle :
 * liked_by_viewer renseigné si viewer authentifié, sinon tous false.
 */
class ListTournamentPostsController extends Controller
{
    public function __invoke(Request $request, Tournament $tournament, FeedService $feed): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $paginator = $tournament->posts()
            ->with(['author:id,uuid,name,picture_url', 'tournament:id,uuid,name,club_id', 'tournament.club:id,name,city'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(perPage: $validated['per_page'] ?? 20, page: $validated['page'] ?? 1);

        $feed->attachViewerLikes($paginator->items(), auth('sanctum')->user());

        return PostResource::collection($paginator);
    }
}
