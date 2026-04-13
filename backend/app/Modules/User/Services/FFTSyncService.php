<?php

namespace App\Modules\User\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FFTSyncService
{
    /**
     * Match exact case-insensible sur (last_name, first_name) dans tenup_rankings.
     * Si match → met à jour user_profiles avec padel_points, ranking, region, tenup_name, tenup_synced_at.
     *
     * @return object|null  Le ranking matché (record tenup_rankings) si succès, sinon null.
     */
    public function syncForUser(User $user): ?object
    {
        if (! $user->profile || ! $user->first_name || ! $user->last_name) {
            return null;
        }

        $row = DB::table('tenup_rankings')
            ->whereRaw('LOWER(last_name) = ?', [mb_strtolower(trim($user->last_name))])
            ->whereRaw('LOWER(first_name) = ?', [mb_strtolower(trim($user->first_name))])
            ->orderByDesc('points')
            ->first();

        if (! $row) {
            Log::info('[FFTSync] No match', ['user_uuid' => $user->uuid, 'name' => $user->name]);
            return null;
        }

        $user->profile->update([
            'padel_points' => $row->points ?? 0,
            'ranking' => $row->ranking ?? null,
            'tenup_name' => $row->name ?? null,
            'region' => $row->region ?? null,
            'tenup_synced_at' => now(),
        ]);

        Log::info('[FFTSync] Synced', [
            'user_uuid' => $user->uuid,
            'points' => $row->points ?? 0,
            'ranking' => $row->ranking ?? null,
        ]);

        return $row;
    }
}
