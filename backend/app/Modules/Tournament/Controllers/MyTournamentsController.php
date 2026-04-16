<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Models\User;
use App\Modules\Tournament\Resources\TournamentCollection;
use Illuminate\Http\Request;

/**
 * GET /tournaments/mine — tournois où le viewer est engagé.
 *
 * Un tournoi est "à moi" si :
 *   - viewer est le créateur (created_by_user_id),
 *   - OU viewer est captain/partner d'une des équipes inscrites/waitlist.
 *
 * Filtre ?status= :
 *   - in_progress : status = 'in_progress'
 *   - upcoming    : status IN ('open', 'full')  — équipe inscrite ou tournoi
 *                   dont je suis organisateur, pas encore lancé
 *   - completed   : status = 'completed'
 *   - (absent)    : toutes statuts confondus
 *
 * Ordonnancement : date ASC pour upcoming/in_progress (chronologique),
 * date DESC pour completed (plus récents en tête).
 *
 * Distinct de /tournaments/for-me qui suggère des tournois PUBLIC matchant
 * le profil de l'user (niveaux préférés + ville) — pas ses engagements.
 */
class MyTournamentsController extends Controller
{
    public function __invoke(Request $request): TournamentCollection
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'status' => ['sometimes', 'in:in_progress,upcoming,completed'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $perPage = $validated['per_page'] ?? 20;
        $statusFilter = $validated['status'] ?? null;

        $query = Tournament::query()
            ->with(['club', 'creator'])
            ->withCount(['registeredTeams', 'waitlistedTeams'])
            ->where(function ($q) use ($user) {
                $q->where('created_by_user_id', $user->id)
                    ->orWhereHas('teams', function ($t) use ($user) {
                        $t->where('captain_id', $user->id)
                            ->orWhere('partner_id', $user->id);
                    });
            });

        if ($statusFilter === 'in_progress') {
            $query->where('status', 'in_progress');
            $query->orderBy('date');
        } elseif ($statusFilter === 'upcoming') {
            $query->whereIn('status', ['open', 'full']);
            $query->orderBy('date');
        } elseif ($statusFilter === 'completed') {
            $query->where('status', 'completed');
            $query->orderByDesc('date');
        } else {
            $query->orderByDesc('date');
        }

        return new TournamentCollection($query->paginate($perPage));
    }
}
