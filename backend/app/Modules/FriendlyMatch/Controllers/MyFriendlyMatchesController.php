<?php

namespace App\Modules\FriendlyMatch\Controllers;

use App\Http\Controllers\Controller;
use App\Models\FriendlyMatch;
use App\Modules\FriendlyMatch\Resources\FriendlyMatchResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MyFriendlyMatchesController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'in:pending,accepted,declined,in_progress,completed'],
        ]);

        $userId = $request->user()->id;

        $matches = FriendlyMatch::query()
            ->with(['participants.user', 'creator'])
            ->whereHas('participants', fn ($q) => $q->where('user_id', $userId))
            ->when($validated['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at')
            ->get();

        return FriendlyMatchResource::collection($matches);
    }
}
