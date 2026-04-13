<?php

namespace App\Jobs;

use App\Models\User;
use App\Modules\User\Services\FFTSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
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

    public function handle(FFTSyncService $service): void
    {
        $user = $this->user->fresh(['profile']);

        if (! $user) {
            Log::warning('[FFTSyncJob] User missing', ['user_uuid' => $this->user->uuid]);
            return;
        }

        $service->syncForUser($user);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('[FFTSyncJob] Failed', [
            'user_uuid' => $this->user->uuid,
            'error' => $e->getMessage(),
        ]);
    }
}
