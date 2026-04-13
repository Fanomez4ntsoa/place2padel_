<?php

namespace App\Providers;

use App\Modules\Auth\Events\UserRegistered;
use App\Modules\Auth\Listeners\DispatchFFTSync;
use App\Modules\Auth\Listeners\SendWelcomeEmail;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Event::listen(UserRegistered::class, DispatchFFTSync::class);
        Event::listen(UserRegistered::class, SendWelcomeEmail::class);
    }
}
