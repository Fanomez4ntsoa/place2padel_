<?php

namespace App\Modules\Tournament\Resources;

use Illuminate\Http\Resources\Json\ResourceCollection;

class TournamentCollection extends ResourceCollection
{
    public $collects = TournamentResource::class;
}
