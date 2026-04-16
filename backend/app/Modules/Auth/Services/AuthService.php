<?php

namespace App\Modules\Auth\Services;

use App\Models\Club;
use App\Models\User;
use App\Modules\Auth\Events\UserRegistered;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\PersonalAccessToken;

class AuthService
{
    private const ACCESS_TTL_MINUTES = 60;
    private const REFRESH_TTL_DAYS = 7;
    private const LOGIN_MAX_ATTEMPTS = 5;
    private const LOGIN_LOCK_SECONDS = 900; // 15 min

    /**
     * @param  array<string,mixed>  $data
     * @return array{user: User, token: string}
     */
    public function register(array $data): array
    {
        $user = DB::transaction(function () use ($data): User {
            $user = User::create([
                'email' => $data['email'],
                'password' => $data['password'],
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'name' => trim($data['first_name'].' '.$data['last_name']),
                // role validé par StoreRegisterRequest (whitelist player|referee).
                // Default player si absent — rétrocompat avec les clients qui n'envoient pas le champ.
                'role' => $data['role'] ?? 'player',
                'auth_type' => 'local',
                'city' => $data['city'] ?? null,
            ]);

            // club_uuid singleton → user_clubs(priority=1). Rétrocompat payload register.
            if (! empty($data['club_uuid'])) {
                $clubId = Club::where('uuid', $data['club_uuid'])->value('id');
                if ($clubId !== null) {
                    $user->clubs()->create(['club_id' => $clubId, 'priority' => 1]);
                }
            }

            $user->profile()->create([
                'license_number' => $data['license_number'] ?? null,
                'max_radius_km' => $data['max_radius_km'] ?? 30,
                'max_radius_training_km' => $data['max_radius_training_km'] ?? 15,
            ]);

            foreach ($data['preferred_levels'] ?? [] as $level) {
                $user->preferredLevels()->create(['level' => $level]);
            }

            return $user;
        });

        UserRegistered::dispatch($user);

        $token = $user->createToken('auth_token')->plainTextToken;

        $user->load(['profile', 'clubs.club', 'preferredLevels', 'availabilities']);

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    /**
     * @param  array{email:string,password:string}  $data
     * @return array{user: User, access_token: string, refresh_token: string}
     */
    public function login(array $data, string $ip): array
    {
        $email = $data['email'];
        $key = $this->loginRateLimitKey($ip, $email);

        if (RateLimiter::tooManyAttempts($key, self::LOGIN_MAX_ATTEMPTS)) {
            $minutes = (int) ceil(RateLimiter::availableIn($key) / 60);
            abort(429, "Trop de tentatives. Réessaie dans {$minutes} minutes.");
        }

        $user = User::where('email', $email)->first();

        if (! $user || ! $user->password || ! Hash::check($data['password'], $user->password)) {
            RateLimiter::hit($key, self::LOGIN_LOCK_SECONDS);
            abort(401, 'Email ou mot de passe incorrect.');
        }

        RateLimiter::clear($key);

        $access = $user->createToken(
            'access',
            ['*'],
            now()->addMinutes(self::ACCESS_TTL_MINUTES),
        )->plainTextToken;

        $refresh = $user->createToken(
            'refresh',
            ['refresh'],
            now()->addDays(self::REFRESH_TTL_DAYS),
        )->plainTextToken;

        $user->load(['profile', 'clubs.club', 'preferredLevels', 'availabilities']);

        return [
            'user' => $user,
            'access_token' => $access,
            'refresh_token' => $refresh,
        ];
    }

    /**
     * Rotation : révoque le refresh token présenté et émet une nouvelle paire.
     *
     * @return array{access_token: string, refresh_token: string}
     */
    public function refresh(string $plainTextRefreshToken): array
    {
        $token = PersonalAccessToken::findToken($plainTextRefreshToken);

        // Strict : l'ability 'refresh' doit être LITTÉRALEMENT présente.
        // Sanctum::can('refresh') retournerait true pour un access token avec
        // abilities ['*'] (wildcard) — on ne veut PAS ce comportement ici.
        if (! $token
            || ! in_array('refresh', (array) $token->abilities, true)
            || ($token->expires_at !== null && $token->expires_at->isPast())
        ) {
            abort(401, 'Refresh token invalide ou expiré.');
        }

        $user = $token->tokenable;

        if (! $user instanceof User) {
            abort(401, 'Utilisateur introuvable.');
        }

        $token->delete();

        $access = $user->createToken(
            'access',
            ['*'],
            now()->addMinutes(self::ACCESS_TTL_MINUTES),
        )->plainTextToken;

        $refresh = $user->createToken(
            'refresh',
            ['refresh'],
            now()->addDays(self::REFRESH_TTL_DAYS),
        )->plainTextToken;

        return [
            'access_token' => $access,
            'refresh_token' => $refresh,
        ];
    }

    /**
     * Révoque le token courant (déconnexion de la session en cours).
     */
    public function logout(PersonalAccessToken $currentToken): void
    {
        $currentToken->delete();
    }

    /**
     * Révoque TOUS les tokens du user (déconnexion de tous les devices).
     */
    public function logoutAll(User $user): int
    {
        return $user->tokens()->delete();
    }

    /**
     * Émet une paire access + refresh Sanctum. Partagé entre login classique
     * et Google OAuth pour uniformiser les TTLs et abilities.
     *
     * @return array{access_token: string, refresh_token: string}
     */
    public function issueTokenPair(User $user): array
    {
        return [
            'access_token' => $user->createToken(
                'access',
                ['*'],
                now()->addMinutes(self::ACCESS_TTL_MINUTES),
            )->plainTextToken,
            'refresh_token' => $user->createToken(
                'refresh',
                ['refresh'],
                now()->addDays(self::REFRESH_TTL_DAYS),
            )->plainTextToken,
        ];
    }

    private function loginRateLimitKey(string $ip, string $email): string
    {
        return 'auth:login:'.$ip.':'.$email;
    }
}
