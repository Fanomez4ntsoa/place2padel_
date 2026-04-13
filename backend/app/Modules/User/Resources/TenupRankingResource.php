<?php

namespace App\Modules\User\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenupRankingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->resource->name,
            'first_name' => $this->resource->first_name,
            'last_name' => $this->resource->last_name,
            'ranking' => $this->resource->ranking !== null ? (int) $this->resource->ranking : null,
            'points' => (int) ($this->resource->points ?? 0),
            'evolution' => $this->resource->evolution,
            'region' => $this->resource->region,
            'gender' => $this->resource->gender,
        ];
    }
}
