<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use Symfony\Component\HttpFoundation\Response;

class DeleteTournamentController extends Controller
{
    public function __invoke(Tournament $tournament): Response
    {
        // Policy : owner (ou admin) ET status ∈ [open, full]. 403 sinon.
        $this->authorize('delete', $tournament);

        // Soft delete — les tournament_teams restent en DB (FK cascade DELETE SQL
        // ne se déclenche pas sur soft-delete, comportement voulu pour audit).
        $tournament->delete();

        return response()->noContent();
    }
}
