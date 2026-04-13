<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Modules\Tournament\Resources\TournamentResource;

class ShowTournamentController extends Controller
{
    public function __invoke(Tournament $tournament): TournamentResource
    {
        $tournament->load([
            'club',
            'creator',
            'registeredTeams' => fn ($q) => $q
                ->orderByRaw('seed IS NULL, seed ASC') // seedés d'abord (quand assigné), puis non-seedés
                ->orderBy('created_at'),
            'registeredTeams.captain:id,uuid',
            'registeredTeams.partner:id,uuid',
            'waitlistedTeams.captain:id,uuid',
            'waitlistedTeams.partner:id,uuid',
        ]);

        return new TournamentResource($tournament);
    }
}
