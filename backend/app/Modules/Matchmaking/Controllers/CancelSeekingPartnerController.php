<?php

namespace App\Modules\Matchmaking\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tournament;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CancelSeekingPartnerController extends Controller
{
    public function __invoke(Request $request, Tournament $tournament): JsonResponse
    {
        $deleted = $tournament->interests()
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json([
            'message' => $deleted ? 'Tu n\'apparais plus dans la liste des joueurs seuls.' : 'Aucune déclaration active.',
            'deleted' => (bool) $deleted,
        ]);
    }
}
