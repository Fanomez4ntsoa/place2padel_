<?php

namespace App\Modules\GameProposal\Services;

use App\Models\FriendlyMatch;
use App\Models\FriendlyMatchParticipant;
use App\Models\GameProposal;
use App\Models\GameProposalInvitee;
use App\Models\User;
use App\Modules\FriendlyMatch\Services\ELOService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * GameProposalService — port Emergent server.py 39b6544 (endpoints game-proposals).
 *
 * Concept : le créateur invite 1-10 joueurs à une partie planifiée (date/heure/club).
 * Dès que 3 invités ont accepté (→ 4 joueurs avec le créateur), status=full.
 * Le créateur peut alors "démarrer" en assignant les rôles (partner, opp1, opp2)
 * parmi les accepted → crée un friendly_match en status=accepted directement
 * (bypass du cycle pending/accept classique car tous ont déjà consenti au niveau proposal).
 */
class GameProposalService
{
    public const MAX_INVITEES = 10;
    public const PLAYERS_PER_MATCH = 4;

    public function __construct(private readonly ELOService $eloService) {}

    /**
     * Crée une proposition avec 1-10 invités. Créateur auto-accepté.
     *
     * @param  array<string>  $inviteeUuids  UUIDs des users invités
     */
    public function create(
        User $creator,
        array $inviteeUuids,
        array $schedule,
    ): GameProposal {
        $count = count($inviteeUuids);
        if ($count < 1 || $count > self::MAX_INVITEES) {
            abort(422, 'Invite entre 1 et '.self::MAX_INVITEES.' joueurs.');
        }

        if (count(array_unique($inviteeUuids)) !== $count) {
            abort(422, 'Liste d\'invités doit contenir des joueurs distincts.');
        }

        $invitees = User::whereIn('uuid', $inviteeUuids)->get();
        if ($invitees->count() !== $count) {
            abort(404, 'Un ou plusieurs joueurs introuvables.');
        }

        if ($invitees->contains('id', $creator->id)) {
            abort(422, 'Tu ne peux pas t\'inviter toi-même.');
        }

        return DB::transaction(function () use ($creator, $invitees, $schedule) {
            $proposal = GameProposal::create([
                'creator_id' => $creator->id,
                'date' => $schedule['date'],
                'time' => $schedule['time'],
                'duration_min' => $schedule['duration_min'] ?? 90,
                'club' => $schedule['club'] ?? null,
                'club_city' => $schedule['club_city'] ?? null,
                'status' => 'open',
            ]);

            foreach ($invitees as $invitee) {
                GameProposalInvitee::create([
                    'game_proposal_id' => $proposal->id,
                    'user_id' => $invitee->id,
                    'response' => 'pending',
                ]);
            }

            return $proposal->fresh(['invitees.user', 'creator']);
        });
    }

    /**
     * Répond à une invitation (accept ou refuse). Si 4 joueurs acceptés (creator +
     * 3 invités) → status passe à "full".
     */
    public function respond(GameProposal $proposal, User $user, string $response): GameProposal
    {
        if ($proposal->status === 'cancelled') {
            throw new HttpException(422, 'Cette partie a été annulée.');
        }
        if ($proposal->status === 'started') {
            throw new HttpException(422, 'Cette partie a déjà démarré.');
        }

        $invitee = GameProposalInvitee::where('game_proposal_id', $proposal->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $invitee) {
            throw new AuthorizationException("Tu n'es pas invité à cette partie.");
        }

        return DB::transaction(function () use ($proposal, $invitee, $response) {
            // Acceptance idempotente : si déjà accepté et re-accept, pas d'erreur.
            if ($invitee->response === 'accepted' && $response === 'accepted') {
                return $proposal->fresh(['invitees.user', 'creator']);
            }

            // Vérif places si acceptation : inclut le creator + invités déjà accepted.
            if ($response === 'accepted') {
                $locked = GameProposal::whereKey($proposal->id)->lockForUpdate()->first();
                $alreadyAcceptedCount = 1 + GameProposalInvitee::where('game_proposal_id', $locked->id)
                    ->where('response', 'accepted')
                    ->count();
                if ($alreadyAcceptedCount >= self::PLAYERS_PER_MATCH) {
                    throw new HttpException(422, 'La partie est complète, toutes les places sont prises.');
                }
            }

            $invitee->update([
                'response' => $response,
                'responded_at' => now(),
            ]);

            // Si 4 joueurs acceptés → status full.
            if ($response === 'accepted') {
                $newAcceptedCount = 1 + GameProposalInvitee::where('game_proposal_id', $proposal->id)
                    ->where('response', 'accepted')
                    ->count();
                if ($newAcceptedCount >= self::PLAYERS_PER_MATCH) {
                    $proposal->update(['status' => 'full']);
                }
            }

            return $proposal->fresh(['invitees.user', 'creator']);
        });
    }

    /**
     * Annulation par le créateur uniquement. Irréversible.
     */
    public function cancel(GameProposal $proposal, User $user): GameProposal
    {
        if ($proposal->creator_id !== $user->id) {
            throw new AuthorizationException('Seul le créateur peut annuler la proposition.');
        }
        if ($proposal->status === 'started') {
            throw new HttpException(422, 'Impossible d\'annuler : la partie a déjà démarré.');
        }

        $proposal->update(['status' => 'cancelled']);

        return $proposal->fresh(['invitees.user', 'creator']);
    }

    /**
     * Démarre la partie : le créateur choisit 3 des invités accepted pour les rôles
     * partner/opp1/opp2, puis on crée un friendly_match directement en status=accepted
     * (bypass du cycle pending/accept — tous ont déjà consenti).
     *
     * @return array{proposal: GameProposal, friendly_match_uuid: string}
     */
    public function start(
        GameProposal $proposal,
        User $creator,
        string $partnerUuid,
        string $opp1Uuid,
        string $opp2Uuid,
    ): array {
        if ($proposal->creator_id !== $creator->id) {
            throw new AuthorizationException('Seul le créateur peut démarrer la partie.');
        }
        if ($proposal->status === 'cancelled') {
            throw new HttpException(422, 'Cette partie a été annulée.');
        }
        if ($proposal->status === 'started') {
            throw new HttpException(422, 'Cette partie a déjà démarré.');
        }

        $acceptedInvitees = $proposal->invitees()
            ->with('user')
            ->where('response', 'accepted')
            ->get();

        if ($acceptedInvitees->count() < 3) {
            throw new HttpException(
                422,
                'Seulement '.$acceptedInvitees->count().'/3 joueurs invités ont accepté (4 joueurs requis avec le créateur).',
            );
        }

        $acceptedUuids = $acceptedInvitees->pluck('user.uuid')->all();
        foreach ([$partnerUuid, $opp1Uuid, $opp2Uuid] as $uuid) {
            if (! in_array($uuid, $acceptedUuids, true)) {
                throw new HttpException(422, "Le joueur {$uuid} n'a pas accepté la partie.");
            }
        }

        $partner = User::where('uuid', $partnerUuid)->first();
        $opp1 = User::where('uuid', $opp1Uuid)->first();
        $opp2 = User::where('uuid', $opp2Uuid)->first();

        return DB::transaction(function () use ($proposal, $creator, $partner, $opp1, $opp2) {
            // Ensure ELOs.
            foreach ([$creator, $partner, $opp1, $opp2] as $u) {
                $this->eloService->ensureForUser($u);
            }

            // Fige elo_before (même contrat que FriendlyMatchService::create).
            $eloBefore = [
                'team1_slot1' => $this->eloService->getElo($creator),
                'team1_slot2' => $this->eloService->getElo($partner),
                'team2_slot1' => $this->eloService->getElo($opp1),
                'team2_slot2' => $this->eloService->getElo($opp2),
            ];

            // Création du friendly_match directement en status=accepted + participants
            // tous pré-acceptés (bypass du cycle pending classique).
            $match = FriendlyMatch::create([
                'creator_id' => $creator->id,
                'status' => 'accepted',
                'elo_before' => $eloBefore,
                'location' => $proposal->club ?? $proposal->club_city,
                'scheduled_at' => $proposal->date->copy()
                    ->setTimeFromTimeString($proposal->time),
            ]);

            $now = now();
            $slots = [
                [1, 1, $creator->id, true],
                [1, 2, $partner->id, false],
                [2, 1, $opp1->id, true],
                [2, 2, $opp2->id, false],
            ];
            foreach ($slots as [$team, $slot, $userId, $isCaptain]) {
                FriendlyMatchParticipant::create([
                    'friendly_match_id' => $match->id,
                    'user_id' => $userId,
                    'team' => $team,
                    'slot' => $slot,
                    'is_captain' => $isCaptain,
                    'accepted_at' => $now,
                ]);
            }

            $proposal->update([
                'status' => 'started',
                'friendly_match_id' => $match->id,
            ]);

            return [
                'proposal' => $proposal->fresh(['invitees.user', 'creator']),
                'friendly_match_uuid' => $match->uuid,
            ];
        });
    }
}
