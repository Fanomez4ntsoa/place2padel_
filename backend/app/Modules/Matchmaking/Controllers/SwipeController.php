<?php

namespace App\Modules\Matchmaking\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Matchmaking\Requests\SwipeRequest;
use App\Modules\Matchmaking\Services\MatchmakingService;
use Illuminate\Http\JsonResponse;

class SwipeController extends Controller
{
    public function __invoke(SwipeRequest $request, MatchmakingService $service): JsonResponse
    {
        $viewer = $request->user();
        $target = User::where('uuid', $request->string('target_uuid')->toString())->firstOrFail();

        $result = $service->recordSwipe($viewer, $target, $request->string('action')->toString());

        return response()->json([
            'data' => [
                'is_match' => $result['is_match'],
                'conversation_uuid' => $result['conversation_uuid'],
                'match_uuid' => $result['match']?->uuid,
            ],
        ]);
    }
}
