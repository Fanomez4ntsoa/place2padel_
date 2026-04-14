<?php

namespace App\Modules\Matchmaking\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Liste les conversations de l'user avec, pour chacune :
 *   - l'autre participant (embed compact),
 *   - last_message / last_message_at,
 *   - unread_count : nombre de notifications 'message' non-lues pointant sur cette conv
 *     (dérivé des rows Notification, pas d'un état per-message dans conversations).
 *
 * Une seule requête agrégée sur notifications pour dériver tous les unread_count.
 */
class ListConversationsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        $conversations = Conversation::forUser($user->id)
            ->with(['userA:id,uuid,name,picture_url', 'userB:id,uuid,name,picture_url'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->get();

        $convUuids = $conversations->pluck('uuid')->all();

        // Agrégation des unread en une seule query via JSON_EXTRACT (MySQL).
        $unreadCounts = Notification::query()
            ->where('user_id', $user->id)
            ->where('type', 'message')
            ->whereNull('read_at')
            ->selectRaw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.conversation_uuid')) as conv_uuid, COUNT(*) as c")
            ->whereIn(DB::raw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.conversation_uuid'))"), $convUuids ?: [''])
            ->groupBy('conv_uuid')
            ->pluck('c', 'conv_uuid')
            ->all();

        $data = $conversations->map(function (Conversation $c) use ($user, $unreadCounts) {
            $other = $c->user_a_id === $user->id ? $c->userB : $c->userA;
            return [
                'uuid' => $c->uuid,
                'other_user' => $other ? [
                    'uuid' => $other->uuid,
                    'name' => $other->name,
                    'picture_url' => $other->picture_url,
                ] : null,
                'last_message' => $c->last_message,
                'last_message_at' => $c->last_message_at,
                'unread_count' => (int) ($unreadCounts[$c->uuid] ?? 0),
            ];
        });

        return response()->json(['data' => $data]);
    }
}
