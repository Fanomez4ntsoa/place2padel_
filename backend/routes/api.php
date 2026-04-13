<?php

use App\Modules\Auth\Controllers\GoogleCallbackController;
use App\Modules\Auth\Controllers\GoogleRedirectController;
use App\Modules\Auth\Controllers\LoginController;
use App\Modules\Auth\Controllers\LogoutAllController;
use App\Modules\Auth\Controllers\LogoutController;
use App\Modules\Auth\Controllers\MeController;
use App\Modules\Auth\Controllers\RefreshController;
use App\Modules\Auth\Controllers\RegisterController;
use App\Modules\User\Controllers\SearchTenupController;
use App\Modules\User\Controllers\SearchUsersController;
use App\Modules\User\Controllers\ShowProfileController;
use App\Modules\User\Controllers\SyncTenupProfileController;
use App\Modules\User\Controllers\UpdateProfileController;
use App\Modules\User\Controllers\UploadProfilePhotoController;
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

    Route::get('auth/google/redirect', GoogleRedirectController::class)
        ->middleware('throttle:20,1')
        ->name('auth.google.redirect');

    Route::get('auth/google/callback', GoogleCallbackController::class)
        ->middleware('throttle:20,1')
        ->name('auth.google.callback');

    Route::middleware(['auth:sanctum', 'access-token'])->group(function () {
        Route::get('auth/me', MeController::class)->name('auth.me');
        Route::post('auth/logout', LogoutController::class)->name('auth.logout');
        Route::post('auth/logout-all', LogoutAllController::class)->name('auth.logout-all');

        Route::patch('profile', UpdateProfileController::class)->name('profile.update');
        Route::post('profile/photo', UploadProfilePhotoController::class)
            ->middleware('throttle:10,1')
            ->name('profile.photo');
        Route::get('users/search', SearchUsersController::class)
            ->middleware('throttle:60,1')
            ->name('users.search');

        Route::post('tenup/sync-profile', SyncTenupProfileController::class)
            ->middleware('throttle:5,1')
            ->name('tenup.sync-profile');
    });

    // Auth optionnelle — le controller gère la projection selon le viewer.
    Route::get('profile/{user}', ShowProfileController::class)
        ->middleware('throttle:60,1')
        ->name('profile.show');

    // Public — autocomplete FFT à l'inscription (avant qu'un user ait un compte).
    Route::get('tenup/search', SearchTenupController::class)
        ->middleware('throttle:30,1')
        ->name('tenup.search');
});
