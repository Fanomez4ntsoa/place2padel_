<?php

namespace App\Modules\Club\Resources;

use Illuminate\Http\Resources\Json\ResourceCollection;

class ClubCollection extends ResourceCollection
{
    public $collects = ClubResource::class;
}
