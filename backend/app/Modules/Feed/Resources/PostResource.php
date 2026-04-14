<?php

namespace App\Modules\Feed\Resources;

use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Post
 * `liked_by_viewer` injecté via attribut virtuel (setAttribute) côté controller
 * pour éviter N+1 sur une page de feed.
 */
class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'type' => $this->type,
            'author' => $this->author ? [
                'uuid' => $this->author->uuid,
                'name' => $this->author->name,
                'picture_url' => $this->author->picture_url,
            ] : null,
            'text' => $this->text,
            'image_url' => $this->image_url,
            'tournament' => $this->tournament ? [
                'uuid' => $this->tournament->uuid,
                'name' => $this->tournament->name,
                'club' => $this->tournament->club
                    ? ['name' => $this->tournament->club->name, 'city' => $this->tournament->club->city]
                    : null,
            ] : null,
            'likes_count' => $this->likes_count,
            'comments_count' => $this->comments_count,
            'liked_by_viewer' => (bool) ($this->resource->liked_by_viewer ?? false),
            'created_at' => $this->created_at,
        ];
    }
}
