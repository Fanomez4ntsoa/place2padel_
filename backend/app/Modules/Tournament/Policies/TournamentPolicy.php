<?php

namespace App\Modules\Tournament\Policies;

use App\Models\Tournament;
use App\Models\User;

class TournamentPolicy
{
    /**
     * Admin peut tout — shortcut exécuté AVANT chaque check si retourne true.
     * null = continue vers la méthode spécifique.
     */
    public function before(User $user, string $ability): ?bool
    {
        return $user->role === 'admin' ? true : null;
    }

    public function update(User $user, Tournament $tournament): bool
    {
        // Owner uniquement, et tant que le tournoi n'est pas lancé (matches générés).
        return $user->id === $tournament->created_by_user_id
            && in_array($tournament->status, ['open', 'full'], true);
    }

    public function delete(User $user, Tournament $tournament): bool
    {
        return $user->id === $tournament->created_by_user_id
            && in_array($tournament->status, ['open', 'full'], true);
    }

    public function launch(User $user, Tournament $tournament): bool
    {
        return $user->id === $tournament->created_by_user_id
            && in_array($tournament->status, ['open', 'full'], true);
    }
}
