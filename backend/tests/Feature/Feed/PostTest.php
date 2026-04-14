<?php

namespace Tests\Feature\Feed;

use App\Models\Post;
use App\Models\Tournament;
use App\Models\TournamentTeam;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostTest extends TestCase
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

    public function test_post_with_text(): void
    {
        $u = User::factory()->create();
        $this->postJson('/api/v1/posts', ['text' => 'Hello'], $this->headers($u))
            ->assertSuccessful();
        $this->assertSame(1, Post::count());
    }

    public function test_post_with_image_url_only(): void
    {
        $u = User::factory()->create();
        $this->postJson('/api/v1/posts', ['image_url' => 'https://example.com/x.png'], $this->headers($u))
            ->assertSuccessful();
    }

    public function test_post_without_text_or_image_422(): void
    {
        $u = User::factory()->create();
        $this->postJson('/api/v1/posts', [], $this->headers($u))
            ->assertStatus(422);
    }

    public function test_post_in_tournament_as_organizer(): void
    {
        $owner = User::factory()->create();
        $t = Tournament::factory()->create(['created_by_user_id' => $owner->id]);

        $this->postJson('/api/v1/posts', [
            'text' => 'Annonce', 'tournament_uuid' => $t->uuid,
        ], $this->headers($owner))->assertSuccessful();
    }

    public function test_post_in_tournament_as_non_participant_forbidden(): void
    {
        $t = Tournament::factory()->create();
        $intruder = User::factory()->create();

        $this->postJson('/api/v1/posts', [
            'text' => 'spam', 'tournament_uuid' => $t->uuid,
        ], $this->headers($intruder))->assertForbidden();
    }

    public function test_post_in_tournament_as_captain_participant(): void
    {
        $t = Tournament::factory()->create();
        $captain = User::factory()->create();
        TournamentTeam::create([
            'tournament_id' => $t->id, 'captain_id' => $captain->id,
            'captain_name' => $captain->name, 'captain_points' => 1000,
            'team_points' => 1000, 'team_name' => 'Eq', 'status' => 'registered',
        ]);

        $this->postJson('/api/v1/posts', [
            'text' => 'GL HF', 'tournament_uuid' => $t->uuid,
        ], $this->headers($captain))->assertSuccessful();
    }

    public function test_delete_by_author(): void
    {
        $u = User::factory()->create();
        $p = Post::create(['author_id' => $u->id, 'type' => 'user', 'text' => 'x']);

        $this->deleteJson("/api/v1/posts/{$p->uuid}", [], $this->headers($u))
            ->assertOk();
        $this->assertSoftDeleted('posts', ['id' => $p->id]);
    }

    public function test_delete_by_non_author_forbidden(): void
    {
        $author = User::factory()->create();
        $intruder = User::factory()->create();
        $p = Post::create(['author_id' => $author->id, 'type' => 'user', 'text' => 'x']);

        $this->deleteJson("/api/v1/posts/{$p->uuid}", [], $this->headers($intruder))
            ->assertForbidden();
    }

    public function test_delete_by_admin(): void
    {
        $author = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $p = Post::create(['author_id' => $author->id, 'type' => 'user', 'text' => 'x']);

        $this->deleteJson("/api/v1/posts/{$p->uuid}", [], $this->headers($admin))
            ->assertOk();
        $this->assertSoftDeleted('posts', ['id' => $p->id]);
    }
}
