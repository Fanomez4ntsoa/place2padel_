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
use App\Modules\Feed\Controllers\CreateCommentController;
use App\Modules\Feed\Controllers\CreatePostController;
use App\Modules\Feed\Controllers\DeleteCommentController;
use App\Modules\Feed\Controllers\DeletePostController;
use App\Modules\Feed\Controllers\FeedController;
use App\Modules\Feed\Controllers\ListCommentsController;
use App\Modules\Feed\Controllers\ListProfilePostsController;
use App\Modules\Feed\Controllers\ListTournamentPostsController;
use App\Modules\Feed\Controllers\ToggleLikeController;
use App\Modules\Matchmaking\Controllers\CancelProposalController;
use App\Modules\Matchmaking\Controllers\CancelSeekingPartnerController;
use App\Modules\Matchmaking\Controllers\DeclareSeekingPartnerController;
use App\Modules\Matchmaking\Controllers\ListConversationsController;
use App\Modules\Matchmaking\Controllers\ListMessagesController;
use App\Modules\Matchmaking\Controllers\ListProposalsController;
use App\Modules\Matchmaking\Controllers\ListSeekingPartnersController;
use App\Modules\Matchmaking\Controllers\MySeekingController;
use App\Modules\Matchmaking\Controllers\PostMessageController;
use App\Modules\Matchmaking\Controllers\ProposeToPartnerController;
use App\Modules\Matchmaking\Controllers\RespondProposalController;
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

        // Matchmaking Phase 4.1 — seeking partner (auth requise).
        // IMPORTANT : 'seeking-partner/my' (literal) — sans conflit avec tournament scope.
        Route::get('seeking-partner/my', MySeekingController::class)
            ->middleware('throttle:60,1')
            ->name('matchmaking.seeking.my');
        Route::post('tournaments/{tournament}/seeking-partner', DeclareSeekingPartnerController::class)
            ->middleware('throttle:20,1')
            ->name('matchmaking.seeking.declare');
        Route::delete('tournaments/{tournament}/seeking-partner', CancelSeekingPartnerController::class)
            ->middleware('throttle:20,1')
            ->name('matchmaking.seeking.cancel');

        // Proposals — création / réponse / annulation.
        Route::post('tournaments/{tournament}/propose-to-partner', ProposeToPartnerController::class)
            ->middleware('throttle:20,1')
            ->name('matchmaking.proposals.create');
        Route::get('proposals', ListProposalsController::class)
            ->middleware('throttle:60,1')
            ->name('matchmaking.proposals.index');
        Route::put('proposals/{proposal}/respond', RespondProposalController::class)
            ->middleware('throttle:30,1')
            ->name('matchmaking.proposals.respond');
        Route::delete('proposals/{proposal}', CancelProposalController::class)
            ->middleware('throttle:20,1')
            ->name('matchmaking.proposals.cancel');

        // Conversations & messages 1-1.
        Route::get('conversations', ListConversationsController::class)
            ->middleware('throttle:60,1')
            ->name('matchmaking.conversations.index');
        Route::get('conversations/{conversation}/messages', ListMessagesController::class)
            ->middleware('throttle:60,1')
            ->name('matchmaking.messages.index');
        Route::post('conversations/{conversation}/messages', PostMessageController::class)
            ->middleware('throttle:60,1')
            ->name('matchmaking.messages.store');

        // Feed Phase 5.1 — endpoints authentifiés.
        Route::get('feed', FeedController::class)
            ->middleware('throttle:120,1')
            ->name('feed.index');
        Route::post('posts', CreatePostController::class)
            ->middleware('throttle:30,1')
            ->name('posts.store');
        Route::delete('posts/{post}', DeletePostController::class)
            ->middleware('throttle:30,1')
            ->name('posts.destroy');
        Route::post('posts/{post}/like', ToggleLikeController::class)
            ->middleware('throttle:120,1')
            ->name('posts.like');
        Route::post('posts/{post}/comments', CreateCommentController::class)
            ->middleware('throttle:60,1')
            ->name('posts.comments.store');
        Route::delete('comments/{comment}', DeleteCommentController::class)
            ->middleware('throttle:30,1')
            ->name('posts.comments.destroy');
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

    // Auth optionnelle — public = count, authentifié = scores compat + détails.
    Route::get('tournaments/{tournament}/seeking-partners', ListSeekingPartnersController::class)
        ->middleware('throttle:60,1')
        ->name('matchmaking.seeking.list');

    // Feed Phase 5.1 — lecture publique (liked_by_viewer renseigné si Bearer fourni).
    Route::get('tournaments/{tournament}/posts', ListTournamentPostsController::class)
        ->middleware('throttle:120,1')
        ->name('posts.tournament');
    Route::get('profile/{user}/posts', ListProfilePostsController::class)
        ->middleware('throttle:120,1')
        ->name('posts.profile');
    Route::get('posts/{post}/comments', ListCommentsController::class)
        ->middleware('throttle:120,1')
        ->name('posts.comments.index');

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
