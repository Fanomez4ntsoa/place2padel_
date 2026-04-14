<?php

namespace App\Modules\Matchmaking\Services;

use App\Models\Conversation;
use App\Models\PrivateMessage;
use App\Models\User;
use App\Modules\Matchmaking\Events\MessageSent;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

/**
 * Cycle de vie des conversations et messages 1-1. Séparé de MatchmakingService :
 * une conversation vit au-delà de la phase d'appariement (proposals) et peut
 * recevoir des messages sans proposal active.
 */
class ConversationService
{
    /**
     * Poste un message dans une conversation + met à jour last_message/at.
     * Le tout en transaction pour que la dénormalisation sur conversation reflète
     * toujours le dernier message effectivement persisté.
     *
     * Guards : sender doit être participant de la conversation.
     *
     * @param  PrivateMessage::TYPE_*  $type
     */
    public function postMessage(
        Conversation $conversation,
        User $sender,
        string $text,
        string $type = PrivateMessage::TYPE_TEXT,
        ?array $data = null,
    ): PrivateMessage {
        if (! $conversation->hasParticipant($sender->id)) {
            throw new AuthorizationException('Seuls les participants peuvent poster dans cette conversation.');
        }

        $message = DB::transaction(function () use ($conversation, $sender, $text, $type, $data) {
            $message = PrivateMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $sender->id,
                'text' => $text,
                'type' => $type,
                'data' => $data,
            ]);

            $conversation->update([
                'last_message' => mb_substr($text, 0, 500),
                'last_message_at' => $message->created_at,
            ]);

            return $message;
        });

        MessageSent::dispatch($message);
        return $message;
    }
}
