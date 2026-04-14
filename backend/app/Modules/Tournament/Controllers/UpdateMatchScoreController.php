<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\TournamentMatch;
use App\Modules\Tournament\Requests\UpdateMatchScoreRequest;
use App\Modules\Tournament\Resources\MatchResource;
use Illuminate\Auth\Access\AuthorizationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UpdateMatchScoreController extends Controller
{
    public function __invoke(UpdateMatchScoreRequest $request, TournamentMatch $match): MatchResource
    {
        if (! in_array($match->status, ['pending', 'in_progress'], true)) {
            throw new HttpException(422, 'Match non modifiable dans ce statut.');
        }

        $userId = $request->user()->id;
        $authorized = in_array($userId, array_filter([
            $match->team1?->captain_id, $match->team1?->partner_id,
            $match->team2?->captain_id, $match->team2?->partner_id,
        ]), true);

        if (! $authorized) {
            throw new AuthorizationException('Seuls capitaines et partenaires des deux équipes peuvent saisir le score.');
        }

        $match->fill([
            'team1_games' => $request->integer('team1_games'),
            'team2_games' => $request->integer('team2_games'),
            'tiebreak_team1' => $request->input('tiebreak_team1'),
            'tiebreak_team2' => $request->input('tiebreak_team2'),
            // Toute nouvelle saisie réinitialise les validations précédentes :
            // si un score était validé puis modifié, les deux capitaines doivent re-valider.
            'validated_by_team1' => false,
            'validated_by_team2' => false,
        ]);

        if ($match->status === 'pending') {
            $match->status = 'in_progress';
        }

        $match->save();

        return new MatchResource($match->fresh(['team1', 'team2', 'winner', 'pool']));
    }
}
