<?php

namespace App\Modules\Matchmaking\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Matchmaking\Resources\PlayerMatchResource;
use App\Modules\Matchmaking\Services\MatchmakingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ListMatchesController extends Controller
{
    public function __invoke(Request $request, MatchmakingService $service): JsonResponse
    {
        $matches = $service->listMatches($request->user());

        return response()->json([
            'data' => PlayerMatchResource::collection($matches),
        ]);
    }
}
