<?php

namespace App\Modules\Matchmaking\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Notification;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Marque tous les messages non-lus d'une conversation comme lus.
 *
 * Le unread_count côté client est dérivé des rows Notification de type 'message'
 * pointant sur la conversation via data->conversation_uuid. Lire la conversation
 * = poser read_at=now() sur toutes ces notifications en un seul UPDATE.
 */
class MarkConversationReadController extends Controller
{
    public function __invoke(Request $request, Conversation $conversation): JsonResponse
    {
        $userId = $request->user()->id;

        if (! $conversation->hasParticipant($userId)) {
            throw new AuthorizationException('Tu n\'es pas participant de cette conversation.');
        }

        $marked = Notification::query()
            ->where('user_id', $userId)
            ->where('type', 'message')
            ->whereNull('read_at')
            ->where(DB::raw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.conversation_uuid'))"), $conversation->uuid)
            ->update(['read_at' => now()]);

        return response()->json([
            'data' => [
                'conversation_uuid' => $conversation->uuid,
                'marked_read' => $marked,
            ],
        ]);
    }
}
