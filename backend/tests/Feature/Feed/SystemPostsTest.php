<?php

namespace Tests\Feature\Feed;

use App\Models\Club;
use App\Models\Post;
use App\Models\User;
use App\Models\UserProfile;
use App\Modules\Auth\Events\UserRegistered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Tests des posts système — tous les listeners ajoutés Phase "Feed system posts" :
 *   - CreateWelcomePostOnUserRegistered
 *   - CreateSystemPostOnFriendlyMatchValidated (via flow HTTP complet)
 *   - CreateTournamentClubPostOnTournamentCreated
 *   - referee_announcement via POST /posts
 *   - backfill welcome post image_url via POST /profile/photo
 */
class SystemPostsTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $u): string
    {
        return $u->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    private function authHeaders(User $u): array
    {
        return ['Authorization' => "Bearer {$this->token($u)}"];
    }

    // ──────────────────────── WELCOME POST ────────────────────────

    public function test_welcome_post_new_player_when_no_license(): void
    {
        $user = User::factory()->create(['name' => 'Alice Martin', 'city' => 'Paris']);
        UserProfile::create(['user_id' => $user->id, 'padel_level' => 4, 'position' => 'left']);

        UserRegistered::dispatch($user);

        $post = Post::where('author_id', $user->id)->first();
        $this->assertNotNull($post);
        $this->assertSame(Post::TYPE_SYSTEM_WELCOME, $post->type);
        $this->assertSame(Post::POST_TYPE_NEW_PLAYER, $post->post_type);
        $this->assertSame(Post::ASPECT_SQUARE, $post->post_aspect);
        $this->assertStringContainsString('Nouveau joueur', $post->text);
        $this->assertStringContainsString('Alice Martin', $post->text);
        $this->assertSame('Paris', $post->metadata['post_player_info']['city']);
        $this->assertSame('left', $post->metadata['post_player_info']['position']);
        $this->assertSame(4, $post->metadata['post_player_info']['padel_level']);
    }

    public function test_welcome_post_new_competitor_when_license_present(): void
    {
        $user = User::factory()->create();
        UserProfile::create([
            'user_id' => $user->id,
            'padel_level' => 6,
            'license_number' => '1234567',
            'padel_points' => 320,
            'ranking' => 4521,
        ]);

        UserRegistered::dispatch($user);

        $post = Post::where('author_id', $user->id)->first();
        $this->assertSame(Post::POST_TYPE_NEW_COMPETITOR, $post->post_type);
        $this->assertStringContainsString('Nouveau compétiteur', $post->text);
        $this->assertSame(320, $post->metadata['post_player_info']['padel_points']);
        $this->assertSame(4521, $post->metadata['post_player_info']['ranking']);
    }

    public function test_welcome_post_via_register_endpoint(): void
    {
        // E2E : le flow register dispatch l'event en fin de transaction.
        // gmail.com : DNS validation `email:rfc,dns` ok (le StoreRegisterRequest
        // impose dns, test.com ne résout pas).
        $this->postJson('/api/v1/auth/register', [
            'email' => 'newuser.welcome@gmail.com',
            'password' => 'Password123',
            'first_name' => 'Jean',
            'last_name' => 'Dupont',
        ])->assertSuccessful();

        $user = User::where('email', 'newuser.welcome@gmail.com')->first();
        $post = Post::where('author_id', $user->id)->first();
        $this->assertNotNull($post);
        $this->assertSame(Post::POST_TYPE_NEW_PLAYER, $post->post_type);
    }

    // ──────────────────── BACKFILL AVATAR ────────────────────

    public function test_photo_upload_backfills_welcome_post_image_url(): void
    {
        Storage::fake(config('filesystems.avatars', 's3'));

        $user = User::factory()->create();
        UserProfile::create(['user_id' => $user->id]);

        UserRegistered::dispatch($user);
        $post = Post::where('author_id', $user->id)->first();
        $this->assertNull($post->image_url);

        $this->post(
            '/api/v1/profile/photo',
            ['image' => UploadedFile::fake()->image('a.jpg', 500, 500)],
            array_merge($this->authHeaders($user), ['Accept' => 'application/json']),
        )->assertSuccessful();

        $post->refresh();
        $this->assertNotNull($post->image_url);
        $this->assertStringContainsString('avatars/'.$user->uuid.'/', $post->image_url);
    }

    public function test_second_photo_upload_does_not_overwrite_welcome_image(): void
    {
        Storage::fake(config('filesystems.avatars', 's3'));

        $user = User::factory()->create();
        UserProfile::create(['user_id' => $user->id]);
        UserRegistered::dispatch($user);

        $this->post(
            '/api/v1/profile/photo',
            ['image' => UploadedFile::fake()->image('a.jpg')],
            array_merge($this->authHeaders($user), ['Accept' => 'application/json']),
        );
        $firstUrl = Post::where('author_id', $user->id)->first()->image_url;
        $this->assertNotNull($firstUrl);

        $this->post(
            '/api/v1/profile/photo',
            ['image' => UploadedFile::fake()->image('b.jpg')],
            array_merge($this->authHeaders($user), ['Accept' => 'application/json']),
        );

        // Même URL qu'après le 1er upload (backfill déjà fait, pas d'overwrite).
        $this->assertSame($firstUrl, Post::where('author_id', $user->id)->first()->image_url);
    }

    // ────────────── TOURNAMENT_CLUB POST ──────────────

    public function test_tournament_creation_emits_tournament_club_post_if_club_has_owner(): void
    {
        $owner = User::factory()->create(['role' => 'club_owner']);
        $club = Club::factory()->create(['owner_id' => $owner->id]);
        $creator = User::factory()->create(['role' => 'referee']);

        $this->postJson('/api/v1/tournaments', [
            'club_uuid' => $club->uuid,
            'name' => 'Open test',
            'type' => 'mixte',
            'level' => 'P100',
            'date' => now()->addDays(14)->format('Y-m-d'),
            'max_teams' => 8,
            'courts_available' => 2,
            'payment_method' => 'on_site',
        ], $this->authHeaders($creator))->assertSuccessful();

        // Deux posts système : le générique + le club-branded.
        $this->assertDatabaseCount('posts', 2);
        $clubPost = Post::where('post_type', Post::POST_TYPE_TOURNAMENT_CLUB)->first();
        $this->assertNotNull($clubPost);
        $this->assertSame($owner->id, $clubPost->author_id);
        $this->assertSame(Post::ASPECT_PORTRAIT, $clubPost->post_aspect);
        $this->assertSame($club->uuid, $clubPost->metadata['post_tournament_club']['club_uuid']);
    }

    public function test_tournament_creation_skips_club_post_if_no_owner(): void
    {
        $club = Club::factory()->create(['owner_id' => null]);
        $creator = User::factory()->create(['role' => 'referee']);

        $this->postJson('/api/v1/tournaments', [
            'club_uuid' => $club->uuid,
            'name' => 'Open test',
            'type' => 'mixte',
            'level' => 'P100',
            'date' => now()->addDays(14)->format('Y-m-d'),
            'max_teams' => 8,
            'courts_available' => 2,
            'payment_method' => 'on_site',
        ], $this->authHeaders($creator))->assertSuccessful();

        // Seul le post générique est créé.
        $this->assertSame(0, Post::where('post_type', Post::POST_TYPE_TOURNAMENT_CLUB)->count());
    }

    // ─────────────── MATCH_RESULT POST ──────────────────────

    public function test_friendly_match_validation_emits_match_result_post(): void
    {
        $creator = User::factory()->create(['name' => 'Alice']);
        UserProfile::create(['user_id' => $creator->id, 'padel_level' => 5]);
        $partner = User::factory()->create(['name' => 'Thomas']);
        UserProfile::create(['user_id' => $partner->id, 'padel_level' => 5]);
        $opp1 = User::factory()->create(['name' => 'Sophie']);
        UserProfile::create(['user_id' => $opp1->id, 'padel_level' => 5]);
        $opp2 = User::factory()->create(['name' => 'Lucas']);
        UserProfile::create(['user_id' => $opp2->id, 'padel_level' => 5]);

        $matchUuid = $this->postJson('/api/v1/friendly-matches', [
            'partner_uuid' => $partner->uuid,
            'opponent1_uuid' => $opp1->uuid,
            'opponent2_uuid' => $opp2->uuid,
        ], $this->authHeaders($creator))->json('data.uuid');

        // Tout le monde accepte + start + score + validate x2.
        foreach ([$partner, $opp1, $opp2] as $u) {
            $this->putJson("/api/v1/friendly-matches/{$matchUuid}/accept", [], $this->authHeaders($u));
        }
        $this->putJson("/api/v1/friendly-matches/{$matchUuid}/start", [], $this->authHeaders($creator));
        $this->putJson("/api/v1/friendly-matches/{$matchUuid}/score", [
            'team1_games' => 6, 'team2_games' => 3,
        ], $this->authHeaders($creator));
        $this->putJson("/api/v1/friendly-matches/{$matchUuid}/validate", ['team' => 1], $this->authHeaders($creator));
        $this->putJson("/api/v1/friendly-matches/{$matchUuid}/validate", ['team' => 2], $this->authHeaders($opp1));

        $post = Post::where('post_type', Post::POST_TYPE_MATCH_RESULT)->first();
        $this->assertNotNull($post);
        $this->assertSame(Post::TYPE_SYSTEM_RESULT_FRIENDLY, $post->type);
        $this->assertSame(Post::ASPECT_SQUARE, $post->post_aspect);
        // Gagnant = team1, captain = creator.
        $this->assertSame($creator->id, $post->author_id);
        $this->assertStringContainsString('Alice & Thomas', $post->text);
        $this->assertStringContainsString('Sophie & Lucas', $post->text);
        $this->assertStringContainsString('6-3', $post->text);
        $this->assertSame(1, $post->metadata['post_match_info']['winner_team']);
        $this->assertSame('6-3', $post->metadata['post_match_info']['score']);
    }

    // ───────────── REFEREE ANNOUNCEMENT ──────────────

    public function test_referee_announcement_accepted_for_referee(): void
    {
        $referee = User::factory()->create(['role' => 'referee']);

        $this->postJson('/api/v1/posts', [
            'text' => 'Tournoi déplacé au court 3',
            'post_type' => 'referee_announcement',
        ], $this->authHeaders($referee))->assertSuccessful();

        $post = Post::where('author_id', $referee->id)->first();
        $this->assertSame(Post::POST_TYPE_REFEREE_ANNOUNCEMENT, $post->post_type);
        $this->assertSame(Post::TYPE_USER, $post->type);
    }

    public function test_referee_announcement_accepted_for_admin(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->postJson('/api/v1/posts', [
            'text' => 'Maintenance prévue',
            'post_type' => 'referee_announcement',
        ], $this->authHeaders($admin))->assertSuccessful();

        $this->assertSame(1, Post::where('post_type', 'referee_announcement')->count());
    }

    public function test_referee_announcement_refused_for_player(): void
    {
        $player = User::factory()->create(['role' => 'player']);

        $this->postJson('/api/v1/posts', [
            'text' => 'Hack',
            'post_type' => 'referee_announcement',
        ], $this->authHeaders($player))->assertForbidden();
    }

    public function test_post_type_other_than_referee_announcement_rejected(): void
    {
        $referee = User::factory()->create(['role' => 'referee']);

        // 'match_result' réservé au listener système.
        $this->postJson('/api/v1/posts', [
            'text' => 'Essai',
            'post_type' => 'match_result',
        ], $this->authHeaders($referee))->assertStatus(422);
    }
}
