<?php

namespace App\Modules\Auth\Services;

use App\Models\User;
use App\Modules\Auth\Events\UserRegistered;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;

class GoogleOAuthService
{
    public function __construct(private readonly AuthService $auth) {}

    /**
     * Résout le callback Google et retourne user + tokens.
     *
     * @return array{user: User, access_token: string, refresh_token: string, created: bool}
     */
    public function handleCallback(): array
    {
        try {
            /** @var SocialiteUser $googleUser */
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            Log::warning('[GoogleOAuth] Callback failed', ['error' => $e->getMessage()]);
            abort(400, 'Authentification Google échouée.');
        }

        $email = strtolower(trim((string) $googleUser->getEmail()));
        if ($email === '') {
            abort(400, 'Google n\'a pas fourni d\'email.');
        }

        [$firstName, $lastName] = $this->extractNames($googleUser);

        [$user, $created] = DB::transaction(function () use ($googleUser, $email, $firstName, $lastName): array {
            $existing = User::where('email', $email)->first();

            if ($existing) {
                if ($existing->auth_type !== 'google') {
                    abort(422, 'Cet email est déjà utilisé avec un mot de passe. Connecte-toi classiquement.');
                }

                $existing->update([
                    'name' => trim($firstName.' '.$lastName) ?: $existing->name,
                    'picture_url' => $googleUser->getAvatar() ?: $existing->picture_url,
                ]);

                return [$existing, false];
            }

            $user = User::create([
                'email' => $email,
                'password' => null,
                'auth_type' => 'google',
                'role' => 'player',
                'first_name' => $firstName,
                'last_name' => $lastName,
                'name' => trim($firstName.' '.$lastName),
                'picture_url' => $googleUser->getAvatar(),
                'email_verified_at' => now(),
            ]);

            $user->profile()->create([
                'max_radius_km' => 30,
                'max_radius_training_km' => 15,
            ]);

            return [$user, true];
        });

        if ($created) {
            UserRegistered::dispatch($user);
        }

        $tokens = $this->auth->issueTokenPair($user);

        $user->load(['profile', 'club', 'preferredLevels', 'availabilities']);

        return [
            'user' => $user,
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
            'created' => $created,
        ];
    }

    /**
     * Google fournit given_name / family_name dans le payload OAuth2.
     * Fallback vers un split naïf de `name` si absents (comptes anciens, G Suite custom, etc.).
     *
     * @return array{0: string, 1: string}
     */
    private function extractNames(SocialiteUser $googleUser): array
    {
        $raw = $googleUser->user ?? [];
        $first = isset($raw['given_name']) ? trim((string) $raw['given_name']) : '';
        $last = isset($raw['family_name']) ? trim((string) $raw['family_name']) : '';

        if ($first === '' || $last === '') {
            $parts = preg_split('/\s+/', trim((string) $googleUser->getName()), 2) ?: [];
            $first = $first !== '' ? $first : ($parts[0] ?? 'Utilisateur');
            $last = $last !== '' ? $last : ($parts[1] ?? 'Google');
        }

        return [$first, $last];
    }
}
