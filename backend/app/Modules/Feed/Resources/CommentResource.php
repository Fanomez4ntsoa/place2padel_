<?php

namespace App\Modules\Feed\Resources;

use App\Models\PostComment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PostComment */
class CommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'user' => $this->user ? [
                'uuid' => $this->user->uuid,
                'name' => $this->user->name,
                'picture_url' => $this->user->picture_url,
            ] : null,
            'text' => $this->text,
            'created_at' => $this->created_at,
        ];
    }
}
