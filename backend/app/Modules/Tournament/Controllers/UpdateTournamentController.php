<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Modules\Tournament\Requests\UpdateTournamentRequest;
use App\Modules\Tournament\Resources\TournamentResource;
use App\Modules\Tournament\Services\TournamentService;

class UpdateTournamentController extends Controller
{
    public function __construct(private readonly TournamentService $service) {}

    public function __invoke(UpdateTournamentRequest $request, Tournament $tournament): TournamentResource
    {
        // Policy : owner OU admin, ET status ∈ [open, full]. 403 sinon.
        $this->authorize('update', $tournament);

        $updated = $this->service->update($tournament, $request->validated());

        return new TournamentResource($updated);
    }
}
