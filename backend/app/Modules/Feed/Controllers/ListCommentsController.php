<?php

namespace App\Modules\Feed\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Modules\Feed\Resources\CommentResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ListCommentsController extends Controller
{
    public function __invoke(Request $request, Post $post): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $paginator = $post->comments()
            ->with('user:id,uuid,name,picture_url')
            ->orderBy('created_at')
            ->orderBy('id')
            ->paginate(perPage: $validated['per_page'] ?? 20, page: $validated['page'] ?? 1);

        return CommentResource::collection($paginator);
    }
}
