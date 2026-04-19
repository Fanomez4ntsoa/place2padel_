<?php

namespace App\Modules\Club\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Club;
use App\Modules\Club\Resources\ClubResource;

class ShowClubController extends Controller
{
    public function __invoke(Club $club): ClubResource
    {
        // Clubs désactivés (is_active=false) sont invisibles même par URL directe.
        // Soft-deleted sont déjà exclus par le route model binding par défaut.
        if (! $club->is_active) {
            abort(404);
        }

        // Enrichit la réponse avec l'owner éventuel (affichage "Patron inscrit"
        // + lecture des posts du patron pour le feed club) et le compteur
        // d'abonnés (stat "Joueurs" du hero ClubDetailPage).
        $club->loadMissing('owner');
        $club->loadCount('subscriptions');

        return new ClubResource($club);
    }
}
