<?php

use App\Modules\Auth\Controllers\LoginController;
use App\Modules\Auth\Controllers\LogoutAllController;
use App\Modules\Auth\Controllers\LogoutController;
use App\Modules\Auth\Controllers\MeController;
use App\Modules\Auth\Controllers\RefreshController;
use App\Modules\Auth\Controllers\RegisterController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/register', RegisterController::class)
        ->middleware('throttle:10,1')
        ->name('auth.register');

    Route::post('auth/login', LoginController::class)
        ->middleware('throttle:20,1')
        ->name('auth.login');

    Route::post('auth/refresh', RefreshController::class)
        ->middleware('throttle:30,1')
        ->name('auth.refresh');

    Route::middleware(['auth:sanctum', 'access-token'])->group(function () {
        Route::get('auth/me', MeController::class)->name('auth.me');
        Route::post('auth/logout', LogoutController::class)->name('auth.logout');
        Route::post('auth/logout-all', LogoutAllController::class)->name('auth.logout-all');
    });
});
