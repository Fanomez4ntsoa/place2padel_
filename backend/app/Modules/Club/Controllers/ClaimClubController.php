<?php

namespace App\Modules\Club\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Modules\Club\Requests\ClaimClubRequest;
use App\Modules\Club\Resources\ClubResource;
use Illuminate\Http\JsonResponse;

class ClaimClubController extends Controller
{
    public function __invoke(ClaimClubRequest $request): JsonResponse
    {
        $user = $request->user();

        // Résolution du club : priorité à club_uuid (strict), fallback club_name (fuzzy ILIKE).
        $club = $request->filled('club_uuid')
            ? Club::where('uuid', $request->string('club_uuid')->toString())->first()
            : Club::where('is_active', true)
                ->where('name', 'like', '%'.$request->string('club_name')->toString().'%')
                ->orderBy('name')
                ->first();

        if (! $club) {
            abort(404, "Club introuvable.");
        }

        // Un club ne peut être revendiqué que s'il n'a pas déjà de propriétaire.
        // Exception : admin peut réattribuer. Ou : le current user est déjà owner → no-op idempotent.
        if ($club->owner_id !== null && $club->owner_id !== $user->id && $user->role !== 'admin') {
            abort(409, "Ce club a déjà un patron inscrit.");
        }

        $club->update([
            'owner_id' => $user->id,
            'club_type' => $request->input('club_type'),
            'claimed_at' => now(),
        ]);

        $club->load('owner');

        return response()->json([
            'data' => new ClubResource($club),
            'message' => 'Club associé avec succès.',
        ]);
    }
}
