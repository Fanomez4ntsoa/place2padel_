<?php

namespace Tests\Feature\Notification;

use App\Jobs\SendEmailJob;
use App\Models\User;
use App\Modules\Notification\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class NotificationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_persists_notification(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $service = app(NotificationService::class);

        $n = $service->create($user, 'reminder_24h', 'Titre', 'Msg');

        $this->assertDatabaseHas('notifications', [
            'id' => $n->id, 'user_id' => $user->id, 'type' => 'reminder_24h',
        ]);
    }

    public function test_create_whitelisted_dispatches_email_job(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        app(NotificationService::class)->create($user, 'registration', 'T', 'M');

        Queue::assertPushed(SendEmailJob::class);
    }

    public function test_create_non_whitelisted_does_not_dispatch_email(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        app(NotificationService::class)->create($user, 'reminder_24h', 'T', 'M');

        Queue::assertNotPushed(SendEmailJob::class);
    }
}
