<?php

namespace App\Modules\FriendlyMatch\Services;

use App\Models\FriendlyMatch;
use App\Models\User;
use App\Models\UserElo;
use Illuminate\Support\Facades\DB;

/**
 * ELOService — port fidèle de _calculate_elo_update + _ensure_user_elo + _get_elo
 * (Emergent server.py 39b6544).
 *
 * Formule : K=0.3, échelle 1-10, diviseur 4 (pas 400 comme l'Elo classique chess).
 * Verrouillage : is_locked = matches_played < 10 (seuil Emergent).
 * ELO affiché : declared_level si locked, sinon elo_level.
 */
class ELOService
{
    public const K_FACTOR = 0.3;
    public const SCALE_DIVIDER = 4; // exposant : (loser - winner) / 4
    public const MIN_ELO = 1.0;
    public const MAX_ELO = 10.0;
    public const LOCK_THRESHOLD = 10; // lock tant que matches_played < 10
    public const DEFAULT_LEVEL = 4;   // si padel_level null sur user_profile

    /**
     * Calcule les nouveaux ELO (winner, loser) après un match.
     *
     * @return array{0: float, 1: float} [new_winner, new_loser] arrondis 2 décimales.
     */
    public function calculateUpdate(float $winnerAvg, float $loserAvg): array
    {
        $expected = 1 / (1 + pow(10, ($loserAvg - $winnerAvg) / self::SCALE_DIVIDER));
        $gain = self::K_FACTOR * (1 - $expected);

        $newWinner = $this->clamp($winnerAvg + $gain);
        $newLoser = $this->clamp($loserAvg - $gain);

        return [
            round($newWinner, 2),
            round($newLoser, 2),
        ];
    }

    /**
     * Crée le UserElo si absent — niveau initial dérivé de user_profile.padel_level
     * (default 4 si absent). Matches starts at 0 → is_locked=true.
     */
    public function ensureForUser(User $user): UserElo
    {
        if ($user->relationLoaded('elo') && $user->elo) {
            return $user->elo;
        }

        $existing = UserElo::where('user_id', $user->id)->first();
        if ($existing) {
            return $existing;
        }

        $user->loadMissing('profile');
        $level = (int) ($user->profile?->padel_level ?? self::DEFAULT_LEVEL);

        return UserElo::create([
            'user_id' => $user->id,
            'declared_level' => $level,
            'elo_level' => (float) $level,
            'matches_played' => 0,
            'matches_won' => 0,
            'matches_lost' => 0,
            'is_locked' => true,
            'history' => [],
            'last_updated_at' => now(),
        ]);
    }

    /**
     * Retourne la valeur ELO pour calcul — si locked, on utilise declared_level (int),
     * sinon elo_level (float). Contrat Emergent _get_elo : la moyenne des équipes au
     * moment du match est calculée avec ces valeurs.
     */
    public function getElo(User $user): float
    {
        $elo = UserElo::where('user_id', $user->id)->first();

        if (! $elo) {
            return (float) self::DEFAULT_LEVEL;
        }

        return $elo->is_locked
            ? (float) $elo->declared_level
            : (float) $elo->elo_level;
    }

    /**
     * Applique le résultat d'un match au ELO des 4 participants (transactionnel + lock).
     *
     * Contrat :
     * - Winners : new_winner pour les 2 joueurs de l'équipe gagnante.
     * - Losers : new_loser pour les 2 joueurs de l'équipe perdante.
     * - matches_played += 1, won/lost += 1, is_locked = (matches_played < 10).
     * - History : append d'un entry {match_uuid, date, result, opponent_avg_elo, elo_before, elo_after}.
     *
     * Appelé depuis FriendlyMatchService::validate() quand validated_by_team1 ET team2.
     *
     * @param  array<int>  $winnerUserIds  2 user_id de l'équipe gagnante
     * @param  array<int>  $loserUserIds   2 user_id de l'équipe perdante
     */
    public function applyMatchResult(
        FriendlyMatch $match,
        float $winnerAvg,
        float $loserAvg,
        array $winnerUserIds,
        array $loserUserIds,
    ): void {
        [$newWinner, $newLoser] = $this->calculateUpdate($winnerAvg, $loserAvg);
        $now = now();

        DB::transaction(function () use ($match, $newWinner, $newLoser, $winnerAvg, $loserAvg, $winnerUserIds, $loserUserIds, $now) {
            foreach ($winnerUserIds as $uid) {
                $this->updateForUser(
                    userId: $uid,
                    matchUuid: $match->uuid,
                    newElo: $newWinner,
                    opponentAvg: $loserAvg,
                    result: 'win',
                    now: $now,
                );
            }
            foreach ($loserUserIds as $uid) {
                $this->updateForUser(
                    userId: $uid,
                    matchUuid: $match->uuid,
                    newElo: $newLoser,
                    opponentAvg: $winnerAvg,
                    result: 'loss',
                    now: $now,
                );
            }
        });
    }

    private function updateForUser(
        int $userId,
        string $matchUuid,
        float $newElo,
        float $opponentAvg,
        string $result,
        \DateTimeInterface $now,
    ): void {
        $elo = UserElo::where('user_id', $userId)->lockForUpdate()->first();
        if (! $elo) {
            return;
        }

        $eloBefore = (float) $elo->elo_level;
        $played = $elo->matches_played + 1;

        $history = $elo->history ?? [];
        $history[] = [
            'match_uuid' => $matchUuid,
            'date' => $now->format(DATE_ATOM),
            'result' => $result,
            'opponent_avg_elo' => $opponentAvg,
            'elo_before' => $eloBefore,
            'elo_after' => $newElo,
        ];

        $elo->update([
            'elo_level' => $newElo,
            'matches_played' => $played,
            'matches_won' => $result === 'win' ? $elo->matches_won + 1 : $elo->matches_won,
            'matches_lost' => $result === 'loss' ? $elo->matches_lost + 1 : $elo->matches_lost,
            'is_locked' => $played < self::LOCK_THRESHOLD,
            'history' => $history,
            'last_updated_at' => $now,
        ]);
    }

    private function clamp(float $value): float
    {
        return max(self::MIN_ELO, min(self::MAX_ELO, $value));
    }
}
