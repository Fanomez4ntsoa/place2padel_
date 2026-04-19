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
     * @return array{user: User, access_token: string, refresh_token: string}
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
                // role validé par StoreRegisterRequest (whitelist player|referee|club_owner).
                // Default player si absent — rétrocompat avec les clients qui n'envoient pas le champ.
                'role' => $data['role'] ?? 'player',
                'auth_type' => 'local',
                'city' => $data['city'] ?? null,
            ]);

            // Clubs — deux formats acceptés :
            // - `clubs` (array UUID max 3) prime → priority 1..3 dans l'ordre.
            // - `club_uuid` (singleton) legacy → priority 1 uniquement.
            $this->applyClubs($user, $data);

            // UserProfile — création + tous les champs profil envoyés à register.
            $user->profile()->create([
                'license_number' => $data['license_number'] ?? null,
                'max_radius_km' => $data['max_radius_km'] ?? 30,
                'max_radius_training_km' => $data['max_radius_training_km'] ?? 15,
                'position' => $data['position'] ?? null,
                'padel_level' => $data['padel_level'] ?? null,
                'bio' => $data['bio'] ?? null,
            ]);

            foreach ($data['preferred_levels'] ?? [] as $level) {
                $user->preferredLevels()->create(['level' => $level]);
            }

            // Availabilities — tuples {day_of_week, period} max 10. Dédup sur (day, period).
            $this->applyAvailabilities($user, $data);

            return $user;
        });

        UserRegistered::dispatch($user);

        // Paire access + refresh alignée sur login (mobile attend les deux tokens pour
        // hydrater son SecureStore ; retourner un seul token legacy faisait crasher
        // setTokens(undefined, undefined) côté mobile après un register pourtant réussi).
        $pair = $this->issueTokenPair($user);

        $user->load(['profile', 'clubs.club', 'preferredLevels', 'availabilities']);

        return [
            'user' => $user,
            'access_token' => $pair['access_token'],
            'refresh_token' => $pair['refresh_token'],
        ];
    }

    /**
     * @param  array<string,mixed>  $data
     */
    private function applyClubs(User $user, array $data): void
    {
        // Format multi (clubs[]) prime — ignore club_uuid si fourni en plus.
        if (array_key_exists('clubs', $data) && is_array($data['clubs']) && ! empty($data['clubs'])) {
            $uuids = array_values(array_unique($data['clubs']));
            $clubIdsByUuid = Club::whereIn('uuid', $uuids)->pluck('id', 'uuid');
            $priority = 1;
            foreach ($uuids as $uuid) {
                $clubId = $clubIdsByUuid[$uuid] ?? null;
                if ($clubId === null) {
                    continue;
                }
                $user->clubs()->create(['club_id' => $clubId, 'priority' => $priority++]);
                if ($priority > 3) {
                    break;
                }
            }
            return;
        }

        // Retrocompat singleton.
        if (! empty($data['club_uuid'])) {
            $clubId = Club::where('uuid', $data['club_uuid'])->value('id');
            if ($clubId !== null) {
                $user->clubs()->create(['club_id' => $clubId, 'priority' => 1]);
            }
        }
    }

    /**
     * @param  array<string,mixed>  $data
     */
    private function applyAvailabilities(User $user, array $data): void
    {
        if (empty($data['availabilities']) || ! is_array($data['availabilities'])) {
            return;
        }

        $seen = [];
        foreach ($data['availabilities'] as $slot) {
            if (! is_array($slot)) {
                continue;
            }
            $day = array_key_exists('day_of_week', $slot) && $slot['day_of_week'] !== null
                ? (int) $slot['day_of_week']
                : null;
            $period = $slot['period'] ?? null;
            if ($period === null) {
                continue;
            }
            $key = ($day ?? 'null').':'.$period;
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $user->availabilities()->create([
                'day_of_week' => $day,
                'period' => $period,
            ]);
        }
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
