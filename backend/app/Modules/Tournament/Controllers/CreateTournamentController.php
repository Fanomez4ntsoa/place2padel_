<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Tournament\Requests\StoreTournamentRequest;
use App\Modules\Tournament\Resources\TournamentResource;
use App\Modules\Tournament\Services\TournamentService;
use Illuminate\Http\JsonResponse;

class CreateTournamentController extends Controller
{
    public function __construct(private readonly TournamentService $service) {}

    public function __invoke(StoreTournamentRequest $request): JsonResponse
    {
        /** @var User $creator */
        $creator = $request->user();

        $tournament = $this->service->create($creator, $request->validated());

        return response()->json([
            'data' => new TournamentResource($tournament),
            'message' => 'Tournoi créé.',
        ], 201);
    }
}
