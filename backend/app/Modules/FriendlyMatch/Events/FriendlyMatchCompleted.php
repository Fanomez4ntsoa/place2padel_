<?php

namespace App\Modules\FriendlyMatch\Events;

use App\Models\FriendlyMatch;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Dispatché quand les 2 capitaines ont validé le score et que le match passe
 * en status='completed' (transaction DB). Consumé par le Feed module pour
 * créer le post système match_result (port Emergent server.py:4899).
 */
class FriendlyMatchCompleted
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly FriendlyMatch $match) {}
}
