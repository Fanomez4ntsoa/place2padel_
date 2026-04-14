<?php

namespace App\Modules\Feed\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeletePostController extends Controller
{
    public function __invoke(Request $request, Post $post): JsonResponse
    {
        $user = $request->user();
        if ($post->author_id !== $user->id && $user->role !== 'admin') {
            throw new AuthorizationException('Seul l\'auteur ou un admin peut supprimer ce post.');
        }

        $post->delete();

        return response()->json(['message' => 'Post supprimé.']);
    }
}
