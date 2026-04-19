<?php

namespace App\Modules\Matchmaking\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Matchmaking\Resources\MatchingCandidateResource;
use App\Modules\Matchmaking\Services\MatchmakingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /matching/candidates — liste des candidats pour le matching global amical.
 * Auth optionnelle (pattern waitlist) : viewer anonyme peut browser la liste
 * sans compat ni exclusion swipes, mais avec les mêmes critères géo/ordre.
 */
class ListMatchingCandidatesController extends Controller
{
    public function __invoke(Request $request, MatchmakingService $service): JsonResponse
    {
        $viewerCandidate = auth('sanctum')->user();
        $viewer = $viewerCandidate instanceof User ? $viewerCandidate : null;

        $city = $request->query('city');
        $cityStr = is_string($city) ? trim($city) : null;

        $candidates = $service->listCompatibleCandidates($viewer, $cityStr ?: null);

        return response()->json([
            'data' => MatchingCandidateResource::collection($candidates),
            'meta' => [
                'authenticated' => $viewer !== null,
                'count' => $candidates->count(),
            ],
        ]);
    }
}
