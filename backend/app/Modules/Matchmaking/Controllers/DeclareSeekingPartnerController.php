<?php

namespace App\Modules\Matchmaking\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Models\TournamentInterest;
use App\Modules\Matchmaking\Requests\DeclareSeekingPartnerRequest;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

class DeclareSeekingPartnerController extends Controller
{
    public function __invoke(DeclareSeekingPartnerRequest $request, Tournament $tournament): JsonResponse
    {
        $user = $request->user();

        // Incohérent : user déjà inscrit au tournoi (captain ou partner) → pas seul.
        $alreadyInTeam = $tournament->teams()
            ->where(fn ($q) => $q->where('captain_id', $user->id)->orWhere('partner_id', $user->id))
            ->exists();
        if ($alreadyInTeam) {
            throw new HttpException(422, 'Tu es déjà inscrit dans une équipe sur ce tournoi.');
        }

        $interest = TournamentInterest::updateOrCreate(
            ['tournament_id' => $tournament->id, 'user_id' => $user->id],
            ['message' => $request->input('message')],
        );

        return response()->json([
            'message' => 'Tu es maintenant visible pour les autres joueurs seuls sur ce tournoi.',
            'created_at' => $interest->created_at,
        ], 201);
    }
}
