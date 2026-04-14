<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\TournamentMatch;
use App\Modules\Tournament\Requests\ForfeitMatchRequest;
use App\Modules\Tournament\Resources\MatchResource;
use App\Modules\Tournament\Services\MatchEngineService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ForfeitMatchController extends Controller
{
    public function __invoke(
        ForfeitMatchRequest $request,
        TournamentMatch $match,
        MatchEngineService $engine,
    ): MatchResource {
        $user = $request->user();
        $match->loadMissing('tournament');

        $isOwner = $match->tournament->created_by_user_id === $user->id;
        $isAdmin = $user->role === 'admin';
        if (! $isOwner && ! $isAdmin) {
            throw new AuthorizationException('Seul l\'organisateur ou un admin peut déclarer forfait.');
        }

        if ($match->status === 'completed' || $match->status === 'forfeit') {
            throw new HttpException(422, 'Match déjà finalisé.');
        }

        if ($match->team2_id === null) {
            // BYE — n'a jamais de match jouable, pas de forfait possible.
            throw new HttpException(422, 'Match BYE — forfait sans objet.');
        }

        $side = $request->string('forfeiting_team')->toString();
        $forfeitingTeamId = $side === 'team1' ? $match->team1_id : $match->team2_id;
        $winnerTeamId = $side === 'team1' ? $match->team2_id : $match->team1_id;

        DB::transaction(function () use ($match, $side, $winnerTeamId, $engine) {
            $locked = TournamentMatch::whereKey($match->id)->lockForUpdate()->first();

            // Score automatique 9-0 en faveur de l'équipe non forfait.
            $locked->team1_games = $side === 'team1' ? 0 : 9;
            $locked->team2_games = $side === 'team1' ? 9 : 0;
            $locked->tiebreak_team1 = null;
            $locked->tiebreak_team2 = null;
            $locked->winner_team_id = $winnerTeamId;
            // Statut dédié 'forfeit' (enum migration) — sémantique distincte de 'completed'.
            // reclassifyAfterMatch se déclenche sur présence du winner_team_id, statut indifférent.
            $locked->status = 'forfeit';
            $locked->validated_by_team1 = true;
            $locked->validated_by_team2 = true;
            $locked->save();

            $engine->reclassifyAfterMatch($locked->fresh());
        });

        return new MatchResource($match->fresh(['team1', 'team2', 'winner', 'pool']));
    }
}
