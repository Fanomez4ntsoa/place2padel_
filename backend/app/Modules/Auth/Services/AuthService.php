<?php

namespace App\Modules\Auth\Services;

use App\Models\Club;
use App\Models\User;
use App\Modules\Auth\Events\UserRegistered;
use Illuminate\Support\Facades\DB;

class AuthService
{
    /**
     * @param  array<string,mixed>  $data  Validated payload from StoreRegisterRequest.
     * @return array{user: User, token: string}
     */
    public function register(array $data): array
    {
        $user = DB::transaction(function () use ($data): User {
            $clubId = null;
            if (! empty($data['club_uuid'])) {
                $clubId = Club::where('uuid', $data['club_uuid'])->value('id');
            }

            $user = User::create([
                'email' => $data['email'],
                'password' => $data['password'],
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'name' => trim($data['first_name'].' '.$data['last_name']),
                'role' => 'player',
                'auth_type' => 'local',
                'city' => $data['city'] ?? null,
                'club_id' => $clubId,
            ]);

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

        $user->load(['profile', 'club', 'preferredLevels', 'availabilities']);

        return [
            'user' => $user,
            'token' => $token,
        ];
    }
}
