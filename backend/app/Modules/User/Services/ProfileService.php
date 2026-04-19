<?php

namespace App\Modules\User\Services;

use App\Models\Club;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProfileService
{
    /**
     * Mise à jour partielle (sémantique PATCH) du profil de l'user.
     * Le split DB users / user_profiles / user_preferred_levels /
     * user_availabilities est géré en interne, en transaction.
     *
     * @param  array<string,mixed>  $data  Payload validé.
     */
    public function update(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data): User {
            $this->applyUserFields($user, $data);
            $this->applyProfileFields($user, $data);
            $this->applyClubs($user, $data);
            $this->applyPreferredLevels($user, $data);
            $this->applyAvailabilities($user, $data);

            return $user->fresh(['profile', 'clubs.club', 'preferredLevels', 'availabilities']);
        });
    }

    /**
     * Upload avatar vers le disque 'avatars' (S3 par défaut).
     * - Supprime l'ancien avatar si présent
     * - Stocke sous avatars/{user_uuid}/{random}.{ext}
     * - Met à jour users.picture_url (path brut — l'accessor Model renvoie l'URL au read)
     */
    public function updatePhoto(User $user, UploadedFile $file): User
    {
        $disk = Storage::disk(config('filesystems.avatars', 's3'));

        $oldPath = $user->getRawOriginal('picture_url');

        $filename = Str::random(32).'.'.$file->getClientOriginalExtension();
        $path = "avatars/{$user->uuid}/{$filename}";

        $disk->putFileAs(dirname($path), $file, basename($path), 'public');

        $user->forceFill(['picture_url' => $path])->save();

        if ($oldPath && $oldPath !== $path) {
            $disk->delete($oldPath);
        }

        // Backfill welcome post — port Emergent server.py:1745-1749.
        // À la 1ère upload, si l'user a un welcome post sans image_url, on
        // lui injecte l'URL publique pour que le post s'illumine dans le feed.
        // Sur les uploads suivants, image_url est déjà renseignée → no-op.
        $publicUrl = $disk->url($path);
        Post::query()
            ->where('author_id', $user->id)
            ->whereIn('post_type', [Post::POST_TYPE_NEW_PLAYER, Post::POST_TYPE_NEW_COMPETITOR])
            ->whereNull('image_url')
            ->update(['image_url' => $publicUrl]);

        return $user->fresh(['profile', 'clubs.club', 'preferredLevels', 'availabilities']);
    }

    /** @param  array<string,mixed>  $data */
    private function applyUserFields(User $user, array $data): void
    {
        $updates = [];

        foreach (['first_name', 'last_name', 'city'] as $field) {
            if (array_key_exists($field, $data)) {
                $updates[$field] = $data[$field];
            }
        }

        // Recompute denormalized `name` if first_name or last_name touched.
        if (isset($updates['first_name']) || isset($updates['last_name'])) {
            $first = $updates['first_name'] ?? $user->first_name;
            $last = $updates['last_name'] ?? $user->last_name;
            $updates['name'] = trim($first.' '.$last);
        }

        if ($updates !== []) {
            $user->update($updates);
        }
    }

    /** @param  array<string,mixed>  $data */
    private function applyProfileFields(User $user, array $data): void
    {
        $fields = [
            'bio', 'position', 'padel_level', 'license_number',
            'latitude', 'longitude', 'max_radius_km', 'max_radius_training_km',
        ];

        $updates = [];
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $updates[$field] = $data[$field];
            }
        }

        if ($updates === []) {
            return;
        }

        if ($user->profile) {
            $user->profile->update($updates);
        } else {
            $user->profile()->create($updates);
        }
    }

    /**
     * Replace semantic : la liste fournie écrase intégralement la précédente.
     *
     * @param  array<string,mixed>  $data
     */
    private function applyPreferredLevels(User $user, array $data): void
    {
        if (! array_key_exists('preferred_levels', $data)) {
            return;
        }

        $user->preferredLevels()->delete();
        foreach (array_unique((array) $data['preferred_levels']) as $level) {
            $user->preferredLevels()->create(['level' => $level]);
        }
    }

    /**
     * Replace semantic : la liste écrase la précédente. Les tuples sont résolus
     * contre `clubs.uuid` → `clubs.id`, priorité 1..N dans l'ordre du tableau.
     * Un UUID inconnu est silencieusement ignoré (la validation Request refuse déjà).
     *
     * @param  array<string,mixed>  $data
     */
    private function applyClubs(User $user, array $data): void
    {
        if (! array_key_exists('clubs', $data)) {
            return;
        }

        $uuids = array_values(array_unique((array) $data['clubs']));
        $clubIdsByUuid = Club::whereIn('uuid', $uuids)->pluck('id', 'uuid');

        $user->clubs()->delete();
        $priority = 1;
        foreach ($uuids as $uuid) {
            $clubId = $clubIdsByUuid[$uuid] ?? null;
            if ($clubId === null) {
                continue;
            }
            $user->clubs()->create([
                'club_id' => $clubId,
                'priority' => $priority++,
            ]);
            if ($priority > 3) {
                break; // Sécurité défensive (la validation max:3 est la source de vérité).
            }
        }
    }

    /**
     * Replace semantic pour les dispos en tuples {day_of_week, period}.
     * Accepte le slot "Flexible" (day_of_week null + period 'all').
     * Déduplique sur (day, period) pour éviter de violer l'UNIQUE composite.
     *
     * @param  array<string,mixed>  $data
     */
    private function applyAvailabilities(User $user, array $data): void
    {
        if (! array_key_exists('availabilities', $data)) {
            return;
        }

        $user->availabilities()->delete();

        $seen = [];
        foreach ((array) $data['availabilities'] as $slot) {
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
}
