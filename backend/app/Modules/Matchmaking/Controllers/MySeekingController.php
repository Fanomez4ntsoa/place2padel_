<?php

namespace App\Modules\Matchmaking\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Mes déclarations "seul pour ce tournoi" — utile pour rappeler à l'user
 * où il s'est inscrit, avec le snapshot minimal du tournoi (nom, date, club).
 */
class MySeekingController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $interests = $request->user()
            ->tournamentInterests()
            ->with(['tournament.club:id,name,city'])
            ->latest()
            ->get();

        $data = $interests->map(fn ($i) => [
            'tournament' => [
                'uuid' => $i->tournament?->uuid,
                'name' => $i->tournament?->name,
                'level' => $i->tournament?->level,
                'date' => $i->tournament?->date,
                'club' => $i->tournament?->club ? ['name' => $i->tournament->club->name, 'city' => $i->tournament->club->city] : null,
            ],
            'message' => $i->message,
            'created_at' => $i->created_at,
        ]);

        return response()->json(['data' => $data]);
    }
}
