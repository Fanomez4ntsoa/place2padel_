<?php

namespace App\Modules\Matchmaking\Events;

use App\Models\Conversation;
use App\Models\PlayerMatch;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Émis quand un like mutuel est détecté (PlayerMatch nouvellement créé).
 * Le Listener envoie 1 notification + 1 email à chacun des 2 users.
 */
class MatchCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly PlayerMatch $match,
        public readonly Conversation $conversation,
    ) {}
}
