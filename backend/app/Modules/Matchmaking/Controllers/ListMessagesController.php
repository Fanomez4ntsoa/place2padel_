<?php

namespace App\Modules\Matchmaking\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Modules\Matchmaking\Resources\MessageResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ListMessagesController extends Controller
{
    public function __invoke(Request $request, Conversation $conversation): AnonymousResourceCollection
    {
        if (! $conversation->hasParticipant($request->user()->id)) {
            throw new AuthorizationException('Tu n\'es pas participant de cette conversation.');
        }

        // 200 derniers messages triés DESC, renvoyés ASC côté client pour affichage chronologique.
        $messages = $conversation->messages()
            ->with('sender:id,uuid,name,picture_url')
            ->orderByDesc('created_at')
            ->orderByDesc('id') // tie-break stable quand plusieurs messages à la même seconde.
            ->limit(200)
            ->get()
            ->reverse()
            ->values();

        return MessageResource::collection($messages);
    }
}
