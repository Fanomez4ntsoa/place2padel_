<?php

namespace App\Modules\Club\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Club\Resources\ClubCollection;
use Illuminate\Http\Request;

class ListSubscriptionsController extends Controller
{
    public function __invoke(Request $request): ClubCollection
    {
        /** @var User $user */
        $user = $request->user();

        // Liste complète (non paginée) : un user a au plus ~85 abonnements (nb total de clubs).
        // Ordre par nom — déterministe, affichable tel quel côté client.
        $clubs = $user->subscribedClubs()
            ->orderBy('name')
            ->get();

        return new ClubCollection($clubs);
    }
}
