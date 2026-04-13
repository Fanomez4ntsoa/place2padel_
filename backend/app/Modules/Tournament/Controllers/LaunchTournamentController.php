<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Modules\Tournament\Resources\TournamentResource;
use App\Modules\Tournament\Services\TournamentService;
use Illuminate\Http\JsonResponse;

class LaunchTournamentController extends Controller
{
    public function __construct(private readonly TournamentService $service) {}

    public function __invoke(Tournament $tournament): JsonResponse
    {
        // Policy : owner (ou admin) ET status ∈ [open, full]. 403 sinon.
        $this->authorize('launch', $tournament);

        $launched = $this->service->launch($tournament);

        return response()->json([
            'data' => new TournamentResource($launched),
            'message' => 'Tournoi lancé. Les matchs seront générés dans un instant.',
        ]);
    }
}
