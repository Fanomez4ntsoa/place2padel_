<?php

use App\Modules\Auth\Controllers\GoogleCallbackController;
use App\Modules\Auth\Controllers\GoogleRedirectController;
use App\Modules\Auth\Controllers\LoginController;
use App\Modules\Auth\Controllers\LogoutAllController;
use App\Modules\Auth\Controllers\LogoutController;
use App\Modules\Auth\Controllers\MeController;
use App\Modules\Auth\Controllers\RefreshController;
use App\Modules\Auth\Controllers\RegisterController;
use App\Modules\Club\Controllers\ListSubscriptionsController;
use App\Modules\Club\Controllers\SearchClubsController;
use App\Modules\Club\Controllers\ShowClubController;
use App\Modules\Club\Controllers\SubscribeClubController;
use App\Modules\Club\Controllers\UnsubscribeClubController;
use App\Modules\Tournament\Controllers\CreateTournamentController;
use App\Modules\Tournament\Controllers\DeleteTournamentController;
use App\Modules\Tournament\Controllers\ForMeTournamentsController;
use App\Modules\Tournament\Controllers\LaunchTournamentController;
use App\Modules\Tournament\Controllers\ListMatchesController;
use App\Modules\Tournament\Controllers\ListPoolsController;
use App\Modules\Tournament\Controllers\ListTournamentsController;
use App\Modules\Tournament\Controllers\RankingController;
use App\Modules\Tournament\Controllers\TeamStatesController;
use App\Modules\Tournament\Controllers\UpdateMatchScoreController;
use App\Modules\Tournament\Controllers\ForfeitMatchController;
use App\Modules\Tournament\Controllers\ValidateMatchController;
use App\Modules\Tournament\Controllers\RegisterTeamController;
use App\Modules\Tournament\Controllers\ShowTournamentController;
use App\Modules\Tournament\Controllers\TournamentQrCodeController;
use App\Modules\Tournament\Controllers\UnregisterTeamController;
use App\Modules\Tournament\Controllers\UpdateTournamentController;
use App\Modules\Notification\Controllers\ListNotificationsController;
use App\Modules\Notification\Controllers\MarkAllReadController;
use App\Modules\Notification\Controllers\MarkNotificationReadController;
use App\Modules\Notification\Controllers\SubscribePushController;
use App\Modules\Notification\Controllers\UnsubscribePushController;
use App\Modules\Notification\Controllers\VapidKeyController;
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

        // IMPORTANT : `clubs/subscriptions` (literal) déclaré AVANT `clubs/{club}/...`
        // pour être matché en priorité (Laravel teste dans l'ordre de déclaration).
        Route::get('clubs/subscriptions', ListSubscriptionsController::class)
            ->middleware('throttle:60,1')
            ->name('clubs.subscriptions');
        Route::post('clubs/{club}/subscribe', SubscribeClubController::class)
            ->middleware('throttle:30,1')
            ->name('clubs.subscribe');
        Route::delete('clubs/{club}/subscribe', UnsubscribeClubController::class)
            ->middleware('throttle:30,1')
            ->name('clubs.unsubscribe');

        Route::post('tournaments', CreateTournamentController::class)
            ->middleware('throttle:20,1')
            ->name('tournaments.store');
        Route::patch('tournaments/{tournament}', UpdateTournamentController::class)
            ->middleware('throttle:30,1')
            ->name('tournaments.update');
        Route::delete('tournaments/{tournament}', DeleteTournamentController::class)
            ->middleware('throttle:10,1')
            ->name('tournaments.destroy');

        // IMPORTANT : `tournaments/for-me` (literal) AVANT `tournaments/{tournament}` wildcard (public).
        Route::get('tournaments/for-me', ForMeTournamentsController::class)
            ->middleware('throttle:60,1')
            ->name('tournaments.for-me');

        Route::post('tournaments/{tournament}/register', RegisterTeamController::class)
            ->middleware('throttle:20,1')
            ->name('tournaments.register');
        Route::delete('tournaments/{tournament}/register', UnregisterTeamController::class)
            ->middleware('throttle:20,1')
            ->name('tournaments.unregister');

        Route::post('tournaments/{tournament}/launch', LaunchTournamentController::class)
            ->middleware('throttle:5,1')
            ->name('tournaments.launch');

        Route::put('matches/{match}/score', UpdateMatchScoreController::class)
            ->middleware('throttle:60,1')
            ->name('matches.score');

        Route::put('matches/{match}/validate', ValidateMatchController::class)
            ->middleware('throttle:30,1')
            ->name('matches.validate');

        Route::post('matches/{match}/forfeit', ForfeitMatchController::class)
            ->middleware('throttle:10,1')
            ->name('matches.forfeit');

        // Notifications — toutes scopées sur l'user courant.
        // IMPORTANT : 'notifications/read-all' (literal) AVANT '{notification}/read' pour ne pas matcher "read-all" comme un uuid.
        Route::get('notifications', ListNotificationsController::class)
            ->middleware('throttle:120,1')
            ->name('notifications.index');
        Route::put('notifications/read-all', MarkAllReadController::class)
            ->middleware('throttle:30,1')
            ->name('notifications.read-all');
        Route::put('notifications/{notification}/read', MarkNotificationReadController::class)
            ->middleware('throttle:60,1')
            ->name('notifications.read');

        // Push Web — stub Phase 3 : endpoints opérationnels, envoi réel en Phase 4.
        Route::get('push/vapid-key', VapidKeyController::class)
            ->middleware('throttle:60,1')
            ->name('push.vapid');
        Route::post('push/subscribe', SubscribePushController::class)
            ->middleware('throttle:10,1')
            ->name('push.subscribe');
        Route::delete('push/unsubscribe', UnsubscribePushController::class)
            ->middleware('throttle:10,1')
            ->name('push.unsubscribe');
    });

    // Auth optionnelle — le controller gère la projection selon le viewer.
    Route::get('profile/{user}', ShowProfileController::class)
        ->middleware('throttle:60,1')
        ->name('profile.show');

    // Public — autocomplete FFT à l'inscription (avant qu'un user ait un compte).
    Route::get('tenup/search', SearchTenupController::class)
        ->middleware('throttle:30,1')
        ->name('tenup.search');

    // Public — recherche clubs (autocomplete, browse).
    Route::get('clubs/search', SearchClubsController::class)
        ->middleware('throttle:60,1')
        ->name('clubs.search');

    Route::get('clubs/{club}', ShowClubController::class)
        ->middleware('throttle:60,1')
        ->name('clubs.show');

    Route::get('tournaments', ListTournamentsController::class)
        ->middleware('throttle:60,1')
        ->name('tournaments.index');

    Route::get('tournaments/{tournament}', ShowTournamentController::class)
        ->middleware('throttle:60,1')
        ->name('tournaments.show');

    Route::get('tournaments/{tournament}/qrcode', TournamentQrCodeController::class)
        ->middleware('throttle:60,1')
        ->name('tournaments.qrcode');

    Route::get('tournaments/{tournament}/matches', ListMatchesController::class)
        ->middleware('throttle:60,1')
        ->name('tournaments.matches.index');

    Route::get('tournaments/{tournament}/pools', ListPoolsController::class)
        ->middleware('throttle:60,1')
        ->name('tournaments.pools.index');

    Route::get('tournaments/{tournament}/ranking', RankingController::class)
        ->middleware('throttle:60,1')
        ->name('tournaments.ranking');

    Route::get('tournaments/{tournament}/team-states', TeamStatesController::class)
        ->middleware('throttle:60,1')
        ->name('tournaments.team-states');
});
