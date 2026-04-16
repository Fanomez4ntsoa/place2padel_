<?php

namespace App\Modules\User\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\User\Resources\ProfileResource;
use App\Modules\User\Services\FFTSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SyncTenupProfileController extends Controller
{
    public function __construct(private readonly FFTSyncService $service) {}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->first_name || ! $user->last_name) {
            return response()->json([
                'message' => 'Renseigne ton prénom et ton nom avant de synchroniser ton classement.',
            ], 422);
        }

        $row = $this->service->syncForUser($user);

        if (! $row) {
            return response()->json([
                'data' => ['synced' => false],
                'message' => "Aucun classement FFT trouvé pour {$user->first_name} {$user->last_name}.",
            ]);
        }

        $user->load(['profile', 'clubs.club', 'preferredLevels', 'availabilities']);

        return response()->json([
            'data' => [
                'synced' => true,
                'user' => new ProfileResource($user, $user),
                'ranking' => [
                    'name' => $row->name,
                    'points' => (int) ($row->points ?? 0),
                    'ranking' => $row->ranking !== null ? (int) $row->ranking : null,
                    'region' => $row->region,
                    'gender' => $row->gender,
                ],
            ],
            'message' => 'Classement FFT synchronisé.',
        ]);
    }
}
