<?php

namespace App\Modules\Auth\Listeners;

use App\Jobs\FFTSyncJob;
use App\Modules\Auth\Events\UserRegistered;

class DispatchFFTSync
{
    public function handle(UserRegistered $event): void
    {
        FFTSyncJob::dispatch($event->user);
    }
}
