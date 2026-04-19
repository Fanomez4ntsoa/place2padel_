<?php

namespace App\Providers;

use App\Models\Tournament;
use App\Modules\Auth\Events\UserRegistered;
use App\Modules\Auth\Listeners\DispatchFFTSync;
use App\Modules\Auth\Listeners\SendWelcomeEmail;
use App\Modules\Feed\Listeners\CreateSystemPostOnTournamentCompleted;
use App\Modules\Feed\Listeners\CreateSystemPostOnTournamentCreated;
use App\Modules\Matchmaking\Events\MatchCreated;
use App\Modules\Matchmaking\Events\MessageSent;
use App\Modules\Matchmaking\Events\ProposalCreated;
use App\Modules\Matchmaking\Events\ProposalResponded;
use App\Modules\Notification\Listeners\DispatchLaunchNotifications;
use App\Modules\Notification\Listeners\NotifyMatchCreated;
use App\Modules\Notification\Listeners\NotifyMessageSent;
use App\Modules\Notification\Listeners\NotifyNewTournament;
use App\Modules\Notification\Listeners\NotifyProposalCreated;
use App\Modules\Notification\Listeners\NotifyProposalResponded;
use App\Modules\Notification\Listeners\NotifyTeamRegistered;
use App\Modules\Notification\Listeners\NotifyTournamentCompleted;
use App\Modules\Notification\Listeners\NotifyWaitlistPromoted;
use App\Modules\Tournament\Events\TeamPromotedFromWaitlist;
use App\Modules\Tournament\Events\TeamRegistered;
use App\Modules\Tournament\Events\TournamentCompleted;
use App\Modules\Tournament\Events\TournamentCreated;
use App\Modules\Tournament\Events\TournamentLaunched;
use App\Modules\Tournament\Listeners\GenerateMatchesListener;
use App\Modules\Tournament\Policies\TournamentPolicy;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
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

        Event::listen(TournamentLaunched::class, GenerateMatchesListener::class);

        // Notifications Phase 3 — multiple listeners par event (ordre = ordre d'appel).
        Event::listen(TeamRegistered::class, NotifyTeamRegistered::class);
        Event::listen(TeamPromotedFromWaitlist::class, NotifyWaitlistPromoted::class);
        Event::listen(TournamentCreated::class, NotifyNewTournament::class);
        Event::listen(TournamentLaunched::class, DispatchLaunchNotifications::class);
        Event::listen(TournamentCompleted::class, NotifyTournamentCompleted::class);

        // Notifications Phase 4.1 — matchmaking.
        Event::listen(ProposalCreated::class, NotifyProposalCreated::class);
        Event::listen(ProposalResponded::class, NotifyProposalResponded::class);
        Event::listen(MessageSent::class, NotifyMessageSent::class);

        // Notifications Phase 4.2 — matching global amical (like mutuel).
        Event::listen(MatchCreated::class, NotifyMatchCreated::class);

        // Feed Phase 5.1 — génération automatique de posts système.
        Event::listen(TournamentCreated::class, CreateSystemPostOnTournamentCreated::class);
        Event::listen(TournamentCompleted::class, CreateSystemPostOnTournamentCompleted::class);

        Gate::policy(Tournament::class, TournamentPolicy::class);
    }
}
