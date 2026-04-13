<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Modules\Auth\Events\UserRegistered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Tests\TestCase;

class GoogleOAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.google.client_id' => 'test-client-id',
            'services.google.client_secret' => 'test-secret',
            'services.google.redirect' => 'http://localhost/api/v1/auth/google/callback',
        ]);
    }

    private function fakeGoogleUser(array $overrides = []): SocialiteUser
    {
        $u = new SocialiteUser();
        $u->id = 'google-123';
        $u->name = 'Jean Dupont';
        $u->email = 'jean@gmail.com';
        $u->avatar = 'https://lh3.googleusercontent.com/a/default';
        $u->user = array_merge([
            'given_name' => 'Jean',
            'family_name' => 'Dupont',
            'email' => 'jean@gmail.com',
            'picture' => 'https://lh3.googleusercontent.com/a/default',
        ], $overrides);
        foreach ($overrides as $k => $v) {
            if (property_exists($u, $k)) {
                $u->{$k} = $v;
            }
        }
        return $u;
    }

    private function mockCallback(SocialiteUser $user): void
    {
        $driver = \Mockery::mock();
        $driver->shouldReceive('stateless')->andReturnSelf();
        $driver->shouldReceive('user')->andReturn($user);
        Socialite::shouldReceive('driver')->with('google')->andReturn($driver);
    }

    public function test_redirect_returns_google_url(): void
    {
        $response = $this->getJson('/api/v1/auth/google/redirect');

        $response->assertOk()
            ->assertJsonStructure(['data' => ['redirect_url']]);

        $url = $response->json('data.redirect_url');
        $this->assertStringContainsString('accounts.google.com', $url);
        $this->assertStringContainsString('client_id=test-client-id', $url);
        $this->assertStringContainsString('scope=openid', $url);
    }

    public function test_callback_creates_new_google_user(): void
    {
        Event::fake([UserRegistered::class]);
        $this->mockCallback($this->fakeGoogleUser());

        $response = $this->getJson('/api/v1/auth/google/callback?code=fake');

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => ['user' => ['uuid', 'email', 'profile'], 'access_token', 'refresh_token'],
                'message',
            ])
            ->assertJsonPath('data.user.email', 'jean@gmail.com')
            ->assertJsonPath('data.user.auth_type', 'google')
            ->assertJsonPath('data.user.first_name', 'Jean')
            ->assertJsonPath('data.user.last_name', 'Dupont');

        $user = User::where('email', 'jean@gmail.com')->first();
        $this->assertNotNull($user);
        $this->assertNull($user->password);
        $this->assertNotNull($user->email_verified_at);
        $this->assertNotNull($user->profile);

        Event::assertDispatched(UserRegistered::class);
    }

    public function test_callback_with_existing_google_user_logs_in_without_creating(): void
    {
        Event::fake([UserRegistered::class]);

        $existing = User::factory()->create([
            'email' => 'jean@gmail.com',
            'auth_type' => 'google',
            'password' => null,
            'name' => 'Old Name',
            'picture_url' => 'https://old.jpg',
        ]);

        $this->mockCallback($this->fakeGoogleUser());

        $response = $this->getJson('/api/v1/auth/google/callback?code=fake');

        $response->assertOk()
            ->assertJsonPath('message', 'Connexion Google réussie.');

        $this->assertSame(1, User::where('email', 'jean@gmail.com')->count());
        $existing->refresh();
        $this->assertSame('Jean Dupont', $existing->name);
        $this->assertSame('https://lh3.googleusercontent.com/a/default', $existing->picture_url);

        Event::assertNotDispatched(UserRegistered::class);
    }

    public function test_callback_refuses_linking_when_local_account_exists(): void
    {
        Event::fake([UserRegistered::class]);

        User::factory()->create([
            'email' => 'jean@gmail.com',
            'auth_type' => 'local',
            'password' => Hash::make('Password123'),
        ]);

        $this->mockCallback($this->fakeGoogleUser());

        $response = $this->getJson('/api/v1/auth/google/callback?code=fake');

        $response->assertStatus(422)
            ->assertJson(['message' => 'Cet email est déjà utilisé avec un mot de passe. Connecte-toi classiquement.']);

        Event::assertNotDispatched(UserRegistered::class);
    }

    public function test_callback_returns_400_when_socialite_fails(): void
    {
        $driver = \Mockery::mock();
        $driver->shouldReceive('stateless')->andReturnSelf();
        $driver->shouldReceive('user')->andThrow(new \RuntimeException('invalid_grant'));
        Socialite::shouldReceive('driver')->with('google')->andReturn($driver);

        $this->getJson('/api/v1/auth/google/callback?code=fake')
            ->assertStatus(400)
            ->assertJson(['message' => 'Authentification Google échouée.']);
    }

    public function test_callback_falls_back_to_name_split_when_given_family_missing(): void
    {
        Event::fake([UserRegistered::class]);

        $u = new SocialiteUser();
        $u->id = 'google-456';
        $u->name = 'Marie Curie';
        $u->email = 'marie@gmail.com';
        $u->avatar = null;
        $u->user = ['email' => 'marie@gmail.com']; // pas de given_name ni family_name

        $this->mockCallback($u);

        $response = $this->getJson('/api/v1/auth/google/callback?code=fake');

        $response->assertStatus(201)
            ->assertJsonPath('data.user.first_name', 'Marie')
            ->assertJsonPath('data.user.last_name', 'Curie');
    }
}
