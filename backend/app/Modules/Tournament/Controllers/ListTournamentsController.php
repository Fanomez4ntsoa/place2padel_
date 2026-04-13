<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Models\Tournament;
use App\Modules\Tournament\Requests\SearchTournamentsRequest;
use App\Modules\Tournament\Resources\TournamentCollection;

class ListTournamentsController extends Controller
{
    public function __invoke(SearchTournamentsRequest $request): TournamentCollection
    {
        $perPage = (int) $request->integer('per_page', 20);

        $query = Tournament::query()
            ->with(['club', 'creator'])
            // Counts pré-calculés → aucune N+1 sur la page.
            ->withCount(['registeredTeams', 'waitlistedTeams'])
            ->when($request->filled('q'), function ($qq) use ($request): void {
                $q = $request->string('q')->toString();
                $qq->where(function ($w) use ($q): void {
                    $w->where('name', 'like', '%'.$q.'%')
                        ->orWhere('location', 'like', '%'.$q.'%');
                });
            })
            ->when($request->filled('club_uuid'), function ($qq) use ($request): void {
                $clubId = Club::where('uuid', $request->string('club_uuid')->toString())->value('id');
                $qq->where('club_id', $clubId);
            })
            ->when($request->filled('city'), function ($qq) use ($request): void {
                $city = $request->string('city')->toString();
                $qq->whereHas('club', fn ($c) => $c->where('city', 'like', $city.'%'));
            })
            ->when($request->filled('level'), fn ($qq) => $qq->where('level', $request->string('level')->toString()))
            ->when($request->filled('type'), fn ($qq) => $qq->where('type', $request->string('type')->toString()))
            ->when($request->filled('status'), fn ($qq) => $qq->where('status', $request->string('status')->toString()))
            ->when($request->filled('date_from'), fn ($qq) => $qq->where('date', '>=', $request->string('date_from')->toString()))
            ->when($request->filled('date_to'), fn ($qq) => $qq->where('date', '<=', $request->string('date_to')->toString()))
            ->orderBy('date')          // Prochains tournois en tête
            ->orderByDesc('created_at'); // Tiebreaker stable

        return new TournamentCollection($query->paginate($perPage));
    }
}
