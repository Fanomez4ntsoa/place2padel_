<?php

namespace App\Modules\FriendlyMatch\Services;

use App\Models\FriendlyMatch;
use App\Models\FriendlyMatchParticipant;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * FriendlyMatchService — orchestrateur du cycle de vie d'un match amical
 * (doubles 2v2 obligatoires, port Emergent 39b6544).
 *
 * Cycle : pending → accepted → in_progress → completed (ou declined).
 *
 * Contrat critique : elo_before est FIGÉ au POST (create), pas au validate.
 * Cela garantit des calculs ELO cohérents même si un participant joue d'autres
 * matchs entre la création et la validation.
 */
class FriendlyMatchService
{
    public function __construct(private readonly ELOService $eloService) {}

    /**
     * Crée un match amical avec 4 participants (creator + partner + 2 opponents).
     * Ensure user_elo pour les 4, puis fige elo_before.
     */
    public function create(User $creator, string $partnerUuid, string $opp1Uuid, string $opp2Uuid): FriendlyMatch
    {
        $partner = User::where('uuid', $partnerUuid)->first();
        $opp1 = User::where('uuid', $opp1Uuid)->first();
        $opp2 = User::where('uuid', $opp2Uuid)->first();

        if (! $partner || ! $opp1 || ! $opp2) {
            abort(404, 'Un ou plusieurs joueurs introuvables.');
        }

        $allIds = [$creator->id, $partner->id, $opp1->id, $opp2->id];
        if (count(array_unique($allIds)) !== 4) {
            abort(422, 'Les 4 joueurs doivent être distincts.');
        }

        // Ensure ELO pour les 4 (création paresseuse).
        foreach ([$creator, $partner, $opp1, $opp2] as $u) {
            $this->eloService->ensureForUser($u);
        }

        // Fige elo_before au moment du POST (contrat Emergent).
        $eloBefore = [
            'team1_slot1' => $this->eloService->getElo($creator),
            'team1_slot2' => $this->eloService->getElo($partner),
            'team2_slot1' => $this->eloService->getElo($opp1),
            'team2_slot2' => $this->eloService->getElo($opp2),
        ];

        return DB::transaction(function () use ($creator, $partner, $opp1, $opp2, $eloBefore) {
            $match = FriendlyMatch::create([
                'creator_id' => $creator->id,
                'status' => 'pending',
                'elo_before' => $eloBefore,
            ]);

            // Creator = team1 slot1, captain (auto-accepté).
            FriendlyMatchParticipant::create([
                'friendly_match_id' => $match->id,
                'user_id' => $creator->id,
                'team' => 1,
                'slot' => 1,
                'is_captain' => true,
                'accepted_at' => now(),
            ]);

            // Partner = team1 slot2, non-accepté.
            FriendlyMatchParticipant::create([
                'friendly_match_id' => $match->id,
                'user_id' => $partner->id,
                'team' => 1,
                'slot' => 2,
                'is_captain' => false,
            ]);

            // Opp1 = team2 slot1, captain de l'équipe adverse, non-accepté.
            FriendlyMatchParticipant::create([
                'friendly_match_id' => $match->id,
                'user_id' => $opp1->id,
                'team' => 2,
                'slot' => 1,
                'is_captain' => true,
            ]);

            // Opp2 = team2 slot2, non-accepté.
            FriendlyMatchParticipant::create([
                'friendly_match_id' => $match->id,
                'user_id' => $opp2->id,
                'team' => 2,
                'slot' => 2,
                'is_captain' => false,
            ]);

            return $match->fresh(['participants.user', 'creator']);
        });
    }

    /**
     * Accepte l'invitation. Si les 4 sont acceptés → status pending → accepted.
     */
    public function accept(FriendlyMatch $match, User $user): FriendlyMatch
    {
        if ($match->status !== 'pending') {
            throw new HttpException(422, 'Match non acceptable dans ce statut.');
        }

        $participant = FriendlyMatchParticipant::where('friendly_match_id', $match->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $participant) {
            throw new AuthorizationException("Tu n'es pas invité à ce match.");
        }

        return DB::transaction(function () use ($match, $participant) {
            $participant->update(['accepted_at' => now()]);

            $acceptedCount = FriendlyMatchParticipant::where('friendly_match_id', $match->id)
                ->whereNotNull('accepted_at')
                ->count();

            if ($acceptedCount === 4) {
                $match->update(['status' => 'accepted']);
            }

            return $match->fresh(['participants.user', 'creator']);
        });
    }

    /**
     * Decline : passe le match en status=declined, définitif.
     */
    public function decline(FriendlyMatch $match, User $user): FriendlyMatch
    {
        if (! $match->hasParticipant($user->id)) {
            throw new AuthorizationException("Tu n'es pas invité à ce match.");
        }

        if (in_array($match->status, ['completed', 'declined'], true)) {
            throw new HttpException(422, 'Match déjà finalisé.');
        }

        $match->update(['status' => 'declined']);

        return $match->fresh(['participants.user', 'creator']);
    }

    /**
     * Start : passe accepted → in_progress + started_at.
     */
    public function start(FriendlyMatch $match, User $user): FriendlyMatch
    {
        if ($match->status !== 'accepted') {
            throw new HttpException(422, "Le match n'est pas encore accepté par les 4 joueurs.");
        }

        if (! $match->hasParticipant($user->id)) {
            throw new AuthorizationException("Tu n'es pas dans ce match.");
        }

        $match->update([
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        return $match->fresh(['participants.user', 'creator']);
    }

    /**
     * Update score — n'importe quel participant peut saisir. Reset des validations
     * (les 2 capitaines doivent re-valider après modif).
     *
     * @param  array{team1_games:int, team2_games:int, tiebreak_team1?:?int, tiebreak_team2?:?int}  $payload
     */
    public function updateScore(FriendlyMatch $match, User $user, array $payload): FriendlyMatch
    {
        if ($match->status !== 'in_progress') {
            throw new HttpException(422, "Le match n'est pas en cours.");
        }

        if (! $match->hasParticipant($user->id)) {
            throw new AuthorizationException("Tu n'es pas dans ce match.");
        }

        $match->update([
            'team1_games' => $payload['team1_games'],
            'team2_games' => $payload['team2_games'],
            'tiebreak_team1' => $payload['tiebreak_team1'] ?? null,
            'tiebreak_team2' => $payload['tiebreak_team2'] ?? null,
            'validated_by_team1' => false,
            'validated_by_team2' => false,
        ]);

        return $match->fresh(['participants.user', 'creator']);
    }

    /**
     * Validate — seul le capitaine de l'équipe désignée peut valider.
     * Si les 2 équipes ont validé → status=completed + apply ELO.
     */
    public function validate(FriendlyMatch $match, User $user, int $team): FriendlyMatch
    {
        if ($match->status !== 'in_progress') {
            throw new HttpException(422, 'Match non validable dans ce statut.');
        }

        if (! in_array($team, [1, 2], true)) {
            throw new HttpException(422, 'Paramètre team invalide (1 ou 2).');
        }

        if ($match->team1_games === null || $match->team2_games === null) {
            throw new HttpException(422, 'Score non saisi.');
        }

        if (! $match->isCaptain($user->id, $team)) {
            throw new AuthorizationException("Seul le capitaine de l'équipe {$team} peut valider.");
        }

        DB::transaction(function () use ($match, $team) {
            $locked = FriendlyMatch::whereKey($match->id)->lockForUpdate()->first();

            $field = $team === 1 ? 'validated_by_team1' : 'validated_by_team2';
            $locked->{$field} = true;
            $locked->save();

            if ($locked->validated_by_team1 && $locked->validated_by_team2) {
                $winnerTeam = $this->determineWinner($locked);
                $loserTeam = $winnerTeam === 1 ? 2 : 1;

                $locked->update([
                    'status' => 'completed',
                    'winner_team' => $winnerTeam,
                    'completed_at' => now(),
                ]);

                $this->applyElo($locked, $winnerTeam, $loserTeam);
            }
        });

        return $match->fresh(['participants.user', 'creator']);
    }

    private function determineWinner(FriendlyMatch $match): int
    {
        if ($match->team1_games > $match->team2_games) {
            return 1;
        }
        if ($match->team2_games > $match->team1_games) {
            return 2;
        }
        // 8-8 : tie-break tranche.
        return ($match->tiebreak_team1 ?? 0) > ($match->tiebreak_team2 ?? 0) ? 1 : 2;
    }

    private function applyElo(FriendlyMatch $match, int $winnerTeam, int $loserTeam): void
    {
        $eloBefore = $match->elo_before ?? [];

        $winnerAvg = (
            ($eloBefore["team{$winnerTeam}_slot1"] ?? 4.0)
            + ($eloBefore["team{$winnerTeam}_slot2"] ?? 4.0)
        ) / 2;

        $loserAvg = (
            ($eloBefore["team{$loserTeam}_slot1"] ?? 4.0)
            + ($eloBefore["team{$loserTeam}_slot2"] ?? 4.0)
        ) / 2;

        $winnerIds = FriendlyMatchParticipant::where('friendly_match_id', $match->id)
            ->where('team', $winnerTeam)
            ->pluck('user_id')
            ->all();
        $loserIds = FriendlyMatchParticipant::where('friendly_match_id', $match->id)
            ->where('team', $loserTeam)
            ->pluck('user_id')
            ->all();

        $this->eloService->applyMatchResult(
            match: $match,
            winnerAvg: $winnerAvg,
            loserAvg: $loserAvg,
            winnerUserIds: $winnerIds,
            loserUserIds: $loserIds,
        );
    }
}
