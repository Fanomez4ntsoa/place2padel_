<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Modules\Tournament\Resources\MatchResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ListMatchesController extends Controller
{
    public function __invoke(Request $request, Tournament $tournament): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:pending,in_progress,completed,forfeit',
            'phase' => 'sometimes|in:poule,bracket,classement',
            'bloc' => 'sometimes|string|max:50',
        ]);

        $matches = $tournament->matches()
            ->with([
                'team1:id,team_name,seed',
                'team2:id,team_name,seed',
                'winner:id,team_name,seed',
                'pool:id,uuid',
            ])
            ->when($validated['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($validated['phase'] ?? null, fn ($q, $v) => $q->where('phase', $v))
            ->when($validated['bloc'] ?? null, fn ($q, $v) => $q->where('bloc', $v))
            ->orderBy('round')
            ->orderBy('match_number')
            ->orderBy('id')
            ->get();

        return MatchResource::collection($matches);
    }
}
