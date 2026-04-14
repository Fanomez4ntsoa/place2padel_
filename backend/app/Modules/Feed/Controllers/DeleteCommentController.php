<?php

namespace App\Modules\Feed\Controllers;

use App\Http\Controllers\Controller;
use App\Models\PostComment;
use App\Modules\Feed\Services\FeedService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeleteCommentController extends Controller
{
    public function __invoke(Request $request, PostComment $comment, FeedService $feed): JsonResponse
    {
        $user = $request->user();
        if ($comment->user_id !== $user->id && $user->role !== 'admin') {
            throw new AuthorizationException('Seul l\'auteur ou un admin peut supprimer ce commentaire.');
        }

        $feed->deleteComment($comment);

        return response()->json(['message' => 'Commentaire supprimé.']);
    }
}
