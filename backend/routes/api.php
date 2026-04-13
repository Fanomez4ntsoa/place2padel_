<?php

use App\Modules\Auth\Controllers\RegisterController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/register', RegisterController::class)
        ->middleware('throttle:10,1')
        ->name('auth.register');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/user', fn (Request $request) => $request->user());
    });
});
