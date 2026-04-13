<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Models\User;
use App\Modules\Tournament\Requests\RegisterTeamRequest;
use App\Modules\Tournament\Resources\TournamentTeamResource;
use App\Modules\Tournament\Services\TournamentService;
use Illuminate\Http\JsonResponse;

class RegisterTeamController extends Controller
{
    public function __construct(private readonly TournamentService $service) {}

    public function __invoke(RegisterTeamRequest $request, Tournament $tournament): JsonResponse
    {
        /** @var User $captain */
        $captain = $request->user();

        $team = $this->service->registerTeam(
            $tournament,
            $captain,
            $request->input('partner_uuid'),
        );

        return response()->json([
            'data' => [
                'team' => new TournamentTeamResource($team),
                'on_waitlist' => $team->status === 'waitlisted',
            ],
            'message' => $team->status === 'waitlisted'
                ? "Tournoi complet — tu es en liste d'attente."
                : 'Inscription confirmée.',
        ], 201);
    }
}
