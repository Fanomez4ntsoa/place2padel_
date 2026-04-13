<?php

namespace App\Modules\User\Resources;

use App\Models\User;
use Illuminate\Http\Resources\Json\ResourceCollection;

class ProfileCollection extends ResourceCollection
{
    /**
     * Pas de `$collects = ProfileResource::class` — on rewrap manuellement
     * dans le constructeur pour passer le `$viewer` (Laravel ne supporte pas
     * un 2e arg au constructeur via collection auto-mapping).
     */
    public function __construct($resource, private readonly ?User $viewer = null)
    {
        parent::__construct($resource);

        $this->collection = $this->collection->map(
            fn ($item) => $item instanceof ProfileResource
                ? $item
                : new ProfileResource($item, $this->viewer),
        );
    }
}
