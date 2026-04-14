<?php

namespace App\Modules\Matchmaking\Events;

use App\Models\PrivateMessage;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly PrivateMessage $message) {}
}
