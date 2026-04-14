<?php

namespace Tests\Feature\Feed;

use App\Models\Club;
use App\Models\ClubSubscription;
use App\Models\Post;
use App\Models\PostComment;
use App\Models\PostLike;
use App\Models\Tournament;
use App\Models\TournamentTeam;
use App\Models\User;
use App\Modules\Feed\Services\FeedService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeedServiceTest extends TestCase
{
    use RefreshDatabase;

    private FeedService $feed;

    protected function setUp(): void
    {
        parent::setUp();
        $this->feed = app(FeedService::class);
    }

    private function makePost(User $author, ?Tournament $t = null, string $text = 'hi'): Post
    {
        return Post::create([
            'author_id' => $author->id,
            'type' => Post::TYPE_USER,
            'text' => $text,
            'tournament_id' => $t?->id,
        ]);
    }

    public function test_feed_all_returns_everything(): void
    {
        $viewer = User::factory()->create();
        $a = User::factory()->create();
        $this->makePost($a);
        $this->makePost($a);

        $p = $this->feed->feedForUser($viewer, FeedService::FILTER_ALL);
        $this->assertSame(2, $p->total());
    }

    public function test_filter_my_tournaments(): void
    {
        $viewer = User::factory()->create();
        $t1 = Tournament::factory()->create();
        $t2 = Tournament::factory()->create();

        TournamentTeam::create([
            'tournament_id' => $t1->id, 'captain_id' => $viewer->id,
            'captain_name' => $viewer->name, 'captain_points' => 1000,
            'team_points' => 1000, 'team_name' => 'Eq', 'status' => 'registered',
        ]);

        $author = User::factory()->create();
        $this->makePost($author, $t1, 'inclu');
        $this->makePost($author, $t2, 'exclu');

        $p = $this->feed->feedForUser($viewer, FeedService::FILTER_MY_TOURNAMENTS);
        $this->assertSame(1, $p->total());
        $this->assertSame('inclu', $p->items()[0]->text);
    }

    public function test_filter_my_partners(): void
    {
        $viewer = User::factory()->create();
        $partner = User::factory()->create();
        $stranger = User::factory()->create();

        $t = Tournament::factory()->create();
        TournamentTeam::create([
            'tournament_id' => $t->id, 'captain_id' => $viewer->id, 'partner_id' => $partner->id,
            'captain_name' => $viewer->name, 'partner_name' => $partner->name,
            'captain_points' => 1000, 'team_points' => 2000, 'team_name' => 'Eq',
            'status' => 'registered',
        ]);

        $this->makePost($partner, null, 'partner-post');
        $this->makePost($stranger, null, 'stranger-post');

        $p = $this->feed->feedForUser($viewer, FeedService::FILTER_MY_PARTNERS);
        $this->assertSame(1, $p->total());
        $this->assertSame('partner-post', $p->items()[0]->text);
    }

    public function test_filter_my_clubs(): void
    {
        $viewer = User::factory()->create();
        $club = Club::factory()->create();
        ClubSubscription::create(['user_id' => $viewer->id, 'club_id' => $club->id]);

        $t = Tournament::factory()->create(['club_id' => $club->id]);
        $other = Tournament::factory()->create();
        $author = User::factory()->create();
        $this->makePost($author, $t, 'club-post');
        $this->makePost($author, $other, 'other');

        $p = $this->feed->feedForUser($viewer, FeedService::FILTER_MY_CLUBS);
        $this->assertSame(1, $p->total());
        $this->assertSame('club-post', $p->items()[0]->text);
    }

    public function test_toggle_like_flips_state_and_count(): void
    {
        $user = User::factory()->create();
        $post = $this->makePost(User::factory()->create());

        $r1 = $this->feed->toggleLike($post, $user);
        $this->assertTrue($r1['liked']);
        $this->assertSame(1, $r1['likes_count']);
        $this->assertSame(1, PostLike::count());

        $r2 = $this->feed->toggleLike($post, $user);
        $this->assertFalse($r2['liked']);
        $this->assertSame(0, $r2['likes_count']);
        $this->assertSame(0, PostLike::count());
    }

    public function test_add_and_delete_comment_maintain_counter(): void
    {
        $user = User::factory()->create();
        $post = $this->makePost(User::factory()->create());

        $c = $this->feed->addComment($post, $user, 'ok');
        $this->assertSame(1, $post->fresh()->comments_count);

        $this->feed->deleteComment($c);
        $this->assertSame(0, $post->fresh()->comments_count);
        $this->assertSame(0, PostComment::count());
    }
}
