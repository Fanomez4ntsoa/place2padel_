<?php

namespace App\Modules\Tournament\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use App\Models\User;
use App\Modules\Tournament\Resources\TournamentCollection;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ForMeTournamentsController extends Controller
{
    public function __invoke(Request $request): TournamentCollection
    {
        /** @var User $user */
        $user = $request->user();

        $levels = $user->preferredLevels()->pluck('level');
        $perPage = max(1, min(50, (int) $request->integer('per_page', 20)));

        // 1er essai : niveaux préférés + ville de l'user
        $primary = $this->baseQuery($levels)
            ->when(
                $user->city,
                fn ($q) => $q->whereHas('club', fn ($c) => $c->where('city', 'like', $user->city.'%')),
            )
            ->paginate($perPage);

        // Fallback Emergent : si 0 résultat ET une ville était appliquée,
        // on retire le filtre ville (niveaux préférés seuls).
        if ($primary->total() === 0 && $user->city) {
            return new TournamentCollection($this->baseQuery($levels)->paginate($perPage));
        }

        return new TournamentCollection($primary);
    }

    /**
     * Base query partagée — tournois ouverts/pleins, optionnellement filtrés par
     * les niveaux préférés de l'user.
     *
     * @param  Collection<int, string>  $levels
     */
    private function baseQuery(Collection $levels): Builder
    {
        return Tournament::query()
            ->with(['club', 'creator'])
            ->withCount(['registeredTeams', 'waitlistedTeams'])
            ->whereIn('status', ['open', 'full'])
            ->when($levels->isNotEmpty(), fn ($q) => $q->whereIn('level', $levels->all()))
            ->orderBy('date')
            ->orderByDesc('created_at');
    }
}
