<?php

namespace App\Modules\Feed\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Modules\Feed\Requests\StoreCommentRequest;
use App\Modules\Feed\Resources\CommentResource;
use App\Modules\Feed\Services\FeedService;

class CreateCommentController extends Controller
{
    public function __invoke(StoreCommentRequest $request, Post $post, FeedService $feed): CommentResource
    {
        $comment = $feed->addComment($post, $request->user(), $request->input('text'));

        return new CommentResource($comment->load('user'));
    }
}
