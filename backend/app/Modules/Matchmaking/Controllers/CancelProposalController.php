<?php

namespace App\Modules\Matchmaking\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Proposal;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Annulation d'une proposal par le proposeur — possible uniquement si pending.
 * Soft-delete (deleted_at) pour auditabilité ; elle disparaît des listes standard.
 */
class CancelProposalController extends Controller
{
    public function __invoke(Request $request, Proposal $proposal): JsonResponse
    {
        if ($proposal->from_user_id !== $request->user()->id) {
            throw new AuthorizationException('Seul l\'émetteur peut annuler cette proposition.');
        }

        if (! $proposal->isPending()) {
            throw new HttpException(422, 'Seules les propositions en attente peuvent être annulées.');
        }

        $proposal->delete();

        return response()->json([
            'message' => 'Proposition annulée.',
        ]);
    }
}
