<?php

namespace App\Modules\Matchmaking\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Proposal;
use App\Modules\Matchmaking\Resources\ProposalResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ListProposalsController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'direction' => ['sometimes', 'in:received,sent,all'],
            'status' => ['sometimes', 'in:pending,accepted,refused'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $direction = $validated['direction'] ?? 'all';
        $perPage = $validated['per_page'] ?? 20;
        $userId = $request->user()->id;

        $query = Proposal::query()->with(['fromUser', 'toUser', 'tournament']);

        $query->where(function ($q) use ($direction, $userId) {
            match ($direction) {
                'received' => $q->where('to_user_id', $userId),
                'sent' => $q->where('from_user_id', $userId),
                default => $q->where('to_user_id', $userId)->orWhere('from_user_id', $userId),
            };
        });

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        return ProposalResource::collection(
            $query->orderByDesc('created_at')->paginate($perPage),
        );
    }
}
