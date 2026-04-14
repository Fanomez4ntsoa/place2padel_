<?php

namespace Tests\Feature\Feed;

use App\Models\Post;
use App\Models\PostComment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LikeCommentTest extends TestCase
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

    private function makePost(): Post
    {
        return Post::create([
            'author_id' => User::factory()->create()->id,
            'type' => 'user', 'text' => 'x',
        ]);
    }

    public function test_like_then_unlike_toggle(): void
    {
        $u = User::factory()->create();
        $p = $this->makePost();

        $r = $this->postJson("/api/v1/posts/{$p->uuid}/like", [], $this->headers($u));
        $r->assertOk()->assertJson(['liked' => true, 'likes_count' => 1]);

        $r = $this->postJson("/api/v1/posts/{$p->uuid}/like", [], $this->headers($u));
        $r->assertOk()->assertJson(['liked' => false, 'likes_count' => 0]);
    }

    public function test_create_comment_increments_count(): void
    {
        $u = User::factory()->create();
        $p = $this->makePost();

        $this->postJson("/api/v1/posts/{$p->uuid}/comments", ['text' => 'gg'], $this->headers($u))
            ->assertSuccessful();

        $this->assertSame(1, $p->fresh()->comments_count);
        $this->assertSame(1, PostComment::count());
    }

    public function test_list_comments_ascending(): void
    {
        $u = User::factory()->create();
        $p = $this->makePost();
        PostComment::create(['post_id' => $p->id, 'user_id' => $u->id, 'text' => '1']);
        PostComment::create(['post_id' => $p->id, 'user_id' => $u->id, 'text' => '2']);
        PostComment::create(['post_id' => $p->id, 'user_id' => $u->id, 'text' => '3']);

        $res = $this->getJson("/api/v1/posts/{$p->uuid}/comments");
        $res->assertOk();
        $texts = array_column($res->json('data'), 'text');
        $this->assertSame(['1', '2', '3'], $texts);
    }

    public function test_delete_comment_by_author_decrements_count(): void
    {
        $u = User::factory()->create();
        $p = $this->makePost();
        $c = PostComment::create(['post_id' => $p->id, 'user_id' => $u->id, 'text' => 'x']);
        $p->increment('comments_count');

        $this->deleteJson("/api/v1/comments/{$c->uuid}", [], $this->headers($u))
            ->assertOk();

        $this->assertSame(0, $p->fresh()->comments_count);
    }

    public function test_delete_comment_by_non_author_forbidden(): void
    {
        $author = User::factory()->create();
        $intruder = User::factory()->create();
        $p = $this->makePost();
        $c = PostComment::create(['post_id' => $p->id, 'user_id' => $author->id, 'text' => 'x']);

        $this->deleteJson("/api/v1/comments/{$c->uuid}", [], $this->headers($intruder))
            ->assertForbidden();
    }
}
