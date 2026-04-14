<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\TournamentMatch;
use App\Modules\Tournament\Requests\ValidateMatchRequest;
use App\Modules\Tournament\Resources\MatchResource;
use App\Modules\Tournament\Services\MatchEngineService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ValidateMatchController extends Controller
{
    public function __invoke(
        ValidateMatchRequest $request,
        TournamentMatch $match,
        MatchEngineService $engine,
    ): MatchResource {
        $side = $request->string('team')->toString(); // 'team1' | 'team2'
        $userId = $request->user()->id;

        // Autorisation : seul le captain de l'équipe désignée. Les partenaires peuvent
        // saisir le score mais pas valider — parité avec double signature capitaine Emergent.
        $match->loadMissing(['team1', 'team2']);
        $team = $side === 'team1' ? $match->team1 : $match->team2;
        if (! $team || $team->captain_id !== $userId) {
            throw new AuthorizationException('Seul le capitaine de cette équipe peut valider le score.');
        }

        if ($match->status === 'completed' || $match->status === 'forfeit') {
            throw new HttpException(422, 'Match déjà finalisé.');
        }

        if ($match->team1_games === null || $match->team2_games === null) {
            throw new HttpException(422, 'Score non saisi.');
        }

        // Transaction + lock pour éviter course entre deux validations simultanées.
        DB::transaction(function () use ($match, $side, $engine) {
            $locked = TournamentMatch::whereKey($match->id)->lockForUpdate()->first();

            $field = $side === 'team1' ? 'validated_by_team1' : 'validated_by_team2';
            $locked->{$field} = true;
            $locked->save();

            if ($locked->validated_by_team1 && $locked->validated_by_team2) {
                $locked->winner_team_id = $this->determineWinner($locked);
                $locked->status = 'completed';
                $locked->save();

                // Note : reclassifyAfterMatch ouvre sa propre DB::transaction. Laravel
                // gère le nesting (savepoint) — pas de conflit.
                $engine->reclassifyAfterMatch($locked->fresh());
            }
        });

        return new MatchResource($match->fresh(['team1', 'team2', 'winner', 'pool']));
    }

    /**
     * Gagnant = plus de jeux. Tie-break à 8-8 départagé par les points de tie-break
     * (écart ≥ 2 garanti par UpdateMatchScoreRequest).
     */
    private function determineWinner(TournamentMatch $match): int
    {
        if ($match->team1_games > $match->team2_games) {
            return $match->team1_id;
        }
        if ($match->team2_games > $match->team1_games) {
            return $match->team2_id;
        }
        // 8-8 : tie-break tranche.
        return ($match->tiebreak_team1 ?? 0) > ($match->tiebreak_team2 ?? 0)
            ? $match->team1_id
            : $match->team2_id;
    }
}
