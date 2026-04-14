<?php

namespace Tests\Feature\Notification;

use App\Jobs\FanoutNotificationJob;
use App\Jobs\SendEmailJob;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class FanoutNotificationJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_empty_user_ids_creates_nothing(): void
    {
        Queue::fake([SendEmailJob::class]);

        (new FanoutNotificationJob([], 'milestone_50', 'T', 'M'))->handle(app(\App\Modules\Notification\Services\NotificationService::class));

        $this->assertSame(0, Notification::count());
    }

    public function test_creates_one_notification_per_user(): void
    {
        Queue::fake([SendEmailJob::class]);

        $users = User::factory()->count(3)->create();
        $job = new FanoutNotificationJob($users->pluck('id')->all(), 'milestone_50', 'T', 'M', '/x');
        $job->handle(app(\App\Modules\Notification\Services\NotificationService::class));

        $this->assertSame(3, Notification::count());
        $this->assertSame(3, Notification::where('type', 'milestone_50')->count());
    }

    public function test_skips_deleted_users(): void
    {
        Queue::fake([SendEmailJob::class]);

        $users = User::factory()->count(3)->create();
        $deleted = $users->pop();
        $deleted->delete();

        $ids = $users->pluck('id')->push($deleted->id)->all();
        $job = new FanoutNotificationJob($ids, 'milestone_50', 'T', 'M');
        $job->handle(app(\App\Modules\Notification\Services\NotificationService::class));

        $this->assertSame(2, Notification::count());
    }
}
