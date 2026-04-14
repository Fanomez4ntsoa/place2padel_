<?php

namespace App\Modules\Feed\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Modules\Feed\Services\FeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ToggleLikeController extends Controller
{
    public function __invoke(Request $request, Post $post, FeedService $feed): JsonResponse
    {
        $result = $feed->toggleLike($post, $request->user());
        return response()->json($result);
    }
}
