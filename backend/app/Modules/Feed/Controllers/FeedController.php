<?php

namespace App\Modules\Feed\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Feed\Resources\PostResource;
use App\Modules\Feed\Services\FeedService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FeedController extends Controller
{
    public function __invoke(Request $request, FeedService $feed): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'filter' => ['sometimes', 'in:all,my-tournaments,my-partners,my-clubs'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $paginator = $feed->feedForUser(
            viewer: $request->user(),
            filter: $validated['filter'] ?? FeedService::FILTER_ALL,
            page: $validated['page'] ?? 1,
            perPage: $validated['per_page'] ?? 20,
        );

        $feed->attachViewerLikes($paginator->items(), $request->user());

        return PostResource::collection($paginator);
    }
}
