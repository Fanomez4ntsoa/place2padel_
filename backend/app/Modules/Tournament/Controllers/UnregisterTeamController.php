<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Models\User;
use App\Modules\Tournament\Resources\TournamentTeamResource;
use App\Modules\Tournament\Services\TournamentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UnregisterTeamController extends Controller
{
    public function __construct(private readonly TournamentService $service) {}

    public function __invoke(Request $request, Tournament $tournament): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $result = $this->service->unregisterTeam($tournament, $user);

        return response()->json([
            'data' => [
                'unregistered' => true,
                'promoted_team' => $result['promoted']
                    ? new TournamentTeamResource($result['promoted']->load(['captain:id,uuid', 'partner:id,uuid']))
                    : null,
            ],
            'message' => $result['promoted']
                ? 'Désinscription OK. Une équipe a été promue de la liste d\'attente.'
                : 'Désinscription OK.',
        ]);
    }
}
