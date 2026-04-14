<?php

namespace App\Modules\Matchmaking\Resources;

use App\Models\Proposal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Proposal */
class ProposalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'type' => $this->type,
            'status' => $this->status,
            'from_user' => $this->fromUser ? [
                'uuid' => $this->fromUser->uuid,
                'name' => $this->fromUser->name,
                'picture_url' => $this->fromUser->picture_url,
            ] : null,
            'to_user' => $this->toUser ? [
                'uuid' => $this->toUser->uuid,
                'name' => $this->toUser->name,
                'picture_url' => $this->toUser->picture_url,
            ] : null,
            'tournament' => $this->tournament ? [
                'uuid' => $this->tournament->uuid,
                'name' => $this->tournament->name,
                'level' => $this->tournament->level,
                'date' => $this->tournament->date,
            ] : null,
            'payload' => $this->payload,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
