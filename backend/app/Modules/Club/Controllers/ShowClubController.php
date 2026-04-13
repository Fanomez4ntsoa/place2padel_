<?php

namespace App\Modules\Club\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Modules\Club\Resources\ClubResource;

class ShowClubController extends Controller
{
    public function __invoke(Club $club): ClubResource
    {
        // Clubs désactivés (is_active=false) sont invisibles même par URL directe.
        // Soft-deleted sont déjà exclus par le route model binding par défaut.
        if (! $club->is_active) {
            abort(404);
        }

        return new ClubResource($club);
    }
}
