<?php

namespace App\Modules\Matchmaking\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\PrivateMessage;
use App\Modules\Matchmaking\Requests\PostMessageRequest;
use App\Modules\Matchmaking\Resources\MessageResource;
use App\Modules\Matchmaking\Services\ConversationService;

class PostMessageController extends Controller
{
    public function __invoke(
        PostMessageRequest $request,
        Conversation $conversation,
        ConversationService $service,
    ): MessageResource {
        $message = $service->postMessage(
            conversation: $conversation,
            sender: $request->user(),
            text: $request->input('text'),
            type: PrivateMessage::TYPE_TEXT,
        );

        return new MessageResource($message->load('sender'));
    }
}
