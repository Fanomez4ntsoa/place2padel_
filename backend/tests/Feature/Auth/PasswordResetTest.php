<?php

namespace Tests\Feature\Auth;

use App\Mail\ResetPasswordMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_returns_generic_message_for_unknown_email(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'nobody@gmail.com',
        ]);

        $response->assertOk()
            ->assertJson(['message' => 'Si ce compte existe, un email a été envoyé.']);

        Mail::assertNothingSent();
    }

    public function test_forgot_password_sends_reset_email_for_local_account(): void
    {
        Mail::fake();
        $user = User::factory()->create([
            'email' => 'jean@gmail.com',
            'auth_type' => 'local',
            'first_name' => 'Jean',
        ]);

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'jean@gmail.com',
        ]);

        $response->assertOk();

        Mail::assertSent(ResetPasswordMail::class, fn (ResetPasswordMail $mail) => $mail->hasTo('jean@gmail.com')
            && str_contains($mail->resetUrl, 'token=')
            && str_contains($mail->resetUrl, 'email=jean%40gmail.com')
            && $mail->firstName === 'Jean');
    }

    public function test_forgot_password_does_not_send_email_for_google_account(): void
    {
        Mail::fake();
        User::factory()->create([
            'email' => 'google@gmail.com',
            'auth_type' => 'google',
            'password' => null,
        ]);

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'google@gmail.com',
        ]);

        $response->assertOk();
        Mail::assertNothingSent();
    }

    public function test_forgot_password_normalizes_email_to_lowercase(): void
    {
        Mail::fake();
        User::factory()->create(['email' => 'jean@gmail.com', 'auth_type' => 'local']);

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => '  JEAN@GMAIL.COM  ',
        ]);

        $response->assertOk();
        Mail::assertSent(ResetPasswordMail::class);
    }

    public function test_forgot_password_validates_email_format(): void
    {
        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'not-an-email',
        ]);

        $response->assertStatus(422);
    }

    public function test_reset_password_updates_password_with_valid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'jean@gmail.com',
            'password' => Hash::make('OldPass123'),
            'auth_type' => 'local',
        ]);

        $token = Password::broker()->createToken($user);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'jean@gmail.com',
            'token' => $token,
            'password' => 'NewPass456',
        ]);

        $response->assertOk()
            ->assertJson(['message' => 'Mot de passe mis à jour avec succès.']);

        $user->refresh();
        $this->assertTrue(Hash::check('NewPass456', $user->password));
    }

    public function test_reset_password_revokes_all_existing_tokens(): void
    {
        $user = User::factory()->create([
            'email' => 'jean@gmail.com',
            'auth_type' => 'local',
        ]);
        $user->createToken('access', ['*']);
        $user->createToken('refresh', ['refresh']);
        $this->assertSame(2, $user->tokens()->count());

        $token = Password::broker()->createToken($user);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'jean@gmail.com',
            'token' => $token,
            'password' => 'NewPass456',
        ])->assertOk();

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_reset_password_fails_with_invalid_token(): void
    {
        User::factory()->create([
            'email' => 'jean@gmail.com',
            'auth_type' => 'local',
        ]);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'jean@gmail.com',
            'token' => 'invalid-token-xyz',
            'password' => 'NewPass456',
        ]);

        $response->assertStatus(400)
            ->assertJson(['message' => 'Lien invalide ou expiré.']);
    }

    public function test_reset_password_fails_with_unknown_email(): void
    {
        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'nobody@gmail.com',
            'token' => 'any-token',
            'password' => 'NewPass456',
        ]);

        $response->assertStatus(400);
    }

    public function test_reset_password_requires_min_8_chars_with_letters_and_numbers(): void
    {
        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'jean@gmail.com',
            'token' => 'anything',
            'password' => 'short',
        ]);

        $response->assertStatus(422);
    }
}
