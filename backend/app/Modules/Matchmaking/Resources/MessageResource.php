<?php

namespace App\Modules\Matchmaking\Resources;

use App\Models\PrivateMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PrivateMessage */
class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'sender' => $this->sender ? [
                'uuid' => $this->sender->uuid,
                'name' => $this->sender->name,
                'picture_url' => $this->sender->picture_url,
            ] : null,
            'text' => $this->text,
            'type' => $this->type,
            'data' => $this->data,
            'created_at' => $this->created_at,
        ];
    }
}
