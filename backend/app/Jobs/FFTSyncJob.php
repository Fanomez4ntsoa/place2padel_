<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FFTSyncJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public readonly User $user)
    {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        $user = $this->user->fresh(['profile']);

        if (! $user || ! $user->profile) {
            Log::warning('[FFTSyncJob] User or profile missing', ['user_uuid' => $this->user->uuid]);
            return;
        }

        // TODO : table `tenup_rankings` à créer + seeder (141 351 licenciés FFT).
        // Match fuzzy case-insensitive sur last_name + first_name (stratégie Emergent).
        // À implémenter quand la table existe.
        $match = DB::table('tenup_rankings')
            ->whereRaw('LOWER(last_name) = ?', [mb_strtolower(trim($user->last_name))])
            ->whereRaw('LOWER(first_name) = ?', [mb_strtolower(trim($user->first_name))])
            ->first();

        if (! $match) {
            Log::info('[FFTSyncJob] No match', [
                'user_uuid' => $user->uuid,
                'name' => $user->name,
            ]);
            return;
        }

        $user->profile->update([
            'padel_points' => $match->points ?? 0,
            'ranking' => $match->ranking ?? null,
            'tenup_name' => $match->name ?? null,
            'region' => $match->region ?? null,
            'tenup_synced_at' => now(),
        ]);

        Log::info('[FFTSyncJob] Synced', [
            'user_uuid' => $user->uuid,
            'points' => $match->points ?? 0,
            'ranking' => $match->ranking ?? null,
        ]);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('[FFTSyncJob] Failed', [
            'user_uuid' => $this->user->uuid,
            'error' => $e->getMessage(),
        ]);
    }
}
