<?php

namespace Tests\Feature\Feed;

use App\Models\Club;
use App\Models\ClubSubscription;
use App\Models\Post;
use App\Models\PostLike;
use App\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeedFilterTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $u): string
    {
        return $u->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    private function headers(User $u): array
    {
        return ['Authorization' => "Bearer {$this->token($u)}"];
    }

    public function test_feed_structure_includes_liked_by_viewer(): void
    {
        $viewer = User::factory()->create();
        $author = User::factory()->create();
        $p = Post::create(['author_id' => $author->id, 'type' => 'user', 'text' => 'hi']);
        PostLike::create(['post_id' => $p->id, 'user_id' => $viewer->id]);
        $p->increment('likes_count');

        $res = $this->getJson('/api/v1/feed', $this->headers($viewer));
        $res->assertOk()
            ->assertJsonStructure(['data' => [['uuid', 'type', 'author', 'text', 'liked_by_viewer', 'likes_count', 'comments_count']], 'meta']);
        $this->assertTrue($res->json('data.0.liked_by_viewer'));
    }

    public function test_feed_filter_my_clubs(): void
    {
        $viewer = User::factory()->create();
        $club = Club::factory()->create();
        ClubSubscription::create(['user_id' => $viewer->id, 'club_id' => $club->id]);

        $t = Tournament::factory()->create(['club_id' => $club->id]);
        $other = Tournament::factory()->create();
        $author = User::factory()->create();
        Post::create(['author_id' => $author->id, 'type' => 'user', 'text' => 'club', 'tournament_id' => $t->id]);
        Post::create(['author_id' => $author->id, 'type' => 'user', 'text' => 'other', 'tournament_id' => $other->id]);

        $res = $this->getJson('/api/v1/feed?filter=my-clubs', $this->headers($viewer));
        $res->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame('club', $res->json('data.0.text'));
    }

    public function test_tournament_posts_public(): void
    {
        $t = Tournament::factory()->create();
        $author = User::factory()->create();
        Post::create(['author_id' => $author->id, 'type' => 'user', 'text' => 'salon', 'tournament_id' => $t->id]);
        Post::create(['author_id' => $author->id, 'type' => 'user', 'text' => 'hors-salon']); // tournament_id null

        $res = $this->getJson("/api/v1/tournaments/{$t->uuid}/posts");
        $res->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame('salon', $res->json('data.0.text'));
    }

    public function test_profile_posts_only_without_tournament(): void
    {
        $author = User::factory()->create();
        $t = Tournament::factory()->create();
        Post::create(['author_id' => $author->id, 'type' => 'user', 'text' => 'profile-free']);
        Post::create(['author_id' => $author->id, 'type' => 'user', 'text' => 'in-salon', 'tournament_id' => $t->id]);

        $res = $this->getJson("/api/v1/profile/{$author->uuid}/posts");
        $res->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame('profile-free', $res->json('data.0.text'));
    }
}
