<?php

namespace Tests\Feature\User;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UploadProfilePhotoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Le disque résolu est 's3' (config filesystems.avatars defaults 's3').
        Storage::fake('s3');
    }

    private function token(User $user): string
    {
        return $user->createToken('access', ['*'], now()->addHour())->plainTextToken;
    }

    public function test_valid_upload_returns_200_with_picture_url(): void
    {
        $user = User::factory()->create();
        $file = UploadedFile::fake()->image('avatar.jpg', 200, 200);

        $response = $this->postJson('/api/v1/profile/photo', ['image' => $file], [
            'Authorization' => "Bearer {$this->token($user)}",
        ]);

        $response->assertOk()
            ->assertJsonStructure(['data' => ['uuid', 'picture_url']]);

        $url = $response->json('data.picture_url');
        $this->assertNotNull($url);
        $this->assertStringContainsString('.jpg', $url);

        // Le path brut en DB doit pointer sur le bon namespace
        $rawPath = $user->fresh()->getRawOriginal('picture_url');
        $this->assertStringStartsWith("avatars/{$user->uuid}/", $rawPath);
        Storage::disk('s3')->assertExists($rawPath);
    }

    public function test_old_avatar_is_deleted_on_replacement(): void
    {
        $user = User::factory()->create();
        $oldPath = "avatars/{$user->uuid}/old.jpg";
        Storage::disk('s3')->put($oldPath, 'old-content');
        $user->forceFill(['picture_url' => $oldPath])->save();

        $file = UploadedFile::fake()->image('new.jpg', 200, 200);
        $this->postJson('/api/v1/profile/photo', ['image' => $file], [
            'Authorization' => "Bearer {$this->token($user)}",
        ])->assertOk();

        Storage::disk('s3')->assertMissing($oldPath);

        $newPath = $user->fresh()->getRawOriginal('picture_url');
        $this->assertNotSame($oldPath, $newPath);
        Storage::disk('s3')->assertExists($newPath);
    }

    public function test_existing_google_cdn_url_is_not_deleted_on_s3(): void
    {
        $user = User::factory()->create();
        $googleUrl = 'https://lh3.googleusercontent.com/a/default-user';
        $user->forceFill(['picture_url' => $googleUrl])->save();

        $file = UploadedFile::fake()->image('avatar.jpg', 200, 200);

        $response = $this->postJson('/api/v1/profile/photo', ['image' => $file], [
            'Authorization' => "Bearer {$this->token($user)}",
        ]);

        $response->assertOk();

        // L'URL Google n'est pas un path S3 ; rien à supprimer ne doit avoir été tenté
        // (Storage::fake aurait throw si l'appel s'était trompé).
        $newPath = $user->fresh()->getRawOriginal('picture_url');
        $this->assertNotSame($googleUrl, $newPath);
        Storage::disk('s3')->assertExists($newPath);
    }

    public function test_oversized_file_returns_422(): void
    {
        $user = User::factory()->create();
        // 6 MB > 5 MB max
        $file = UploadedFile::fake()->image('big.jpg')->size(6 * 1024);

        $this->postJson('/api/v1/profile/photo', ['image' => $file], [
            'Authorization' => "Bearer {$this->token($user)}",
        ])->assertStatus(422)->assertJsonValidationErrors(['image']);
    }

    public function test_wrong_format_returns_422(): void
    {
        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $this->postJson('/api/v1/profile/photo', ['image' => $file], [
            'Authorization' => "Bearer {$this->token($user)}",
        ])->assertStatus(422)->assertJsonValidationErrors(['image']);
    }

    public function test_no_token_returns_401(): void
    {
        $file = UploadedFile::fake()->image('avatar.jpg');
        $this->postJson('/api/v1/profile/photo', ['image' => $file])->assertStatus(401);
    }

    public function test_refresh_token_returns_401(): void
    {
        $user = User::factory()->create();
        $refresh = $user->createToken('refresh', ['refresh'], now()->addDays(7))->plainTextToken;
        $file = UploadedFile::fake()->image('avatar.jpg');

        $this->postJson('/api/v1/profile/photo', ['image' => $file], [
            'Authorization' => "Bearer {$refresh}",
        ])->assertStatus(401);
    }
}
