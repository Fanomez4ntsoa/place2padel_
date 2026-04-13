<?php

namespace App\Modules\Tournament\Services;

use App\Models\Club;
use App\Models\Tournament;
use App\Models\TournamentTeam;
use App\Models\User;
use App\Modules\Tournament\Events\TeamPromotedFromWaitlist;
use App\Modules\Tournament\Events\TeamRegistered;
use App\Modules\Tournament\Events\TeamUnregistered;
use App\Modules\Tournament\Events\TournamentCreated;
use App\Modules\Tournament\Events\TournamentLaunched;
use Illuminate\Support\Facades\DB;

class TournamentService
{
    /**
     * @param  array<string,mixed>  $data  Payload validé (StoreTournamentRequest)
     */
    public function create(User $creator, array $data): Tournament
    {
        $clubId = Club::where('uuid', $data['club_uuid'])->value('id');

        $tournament = DB::transaction(function () use ($creator, $data, $clubId): Tournament {
            $t = Tournament::create([
                'club_id' => $clubId,
                'created_by_user_id' => $creator->id,
                'name' => $data['name'],
                'location' => $data['location'] ?? null,
                'type' => $data['type'],
                'level' => $data['level'],
                'date' => $data['date'],
                'start_time' => $data['start_time'] ?? '09:00',
                'inscription_deadline' => $data['inscription_deadline'] ?? null,
                'max_teams' => $data['max_teams'],
                'courts_available' => $data['courts_available'] ?? 4,
                'price' => $data['price'] ?? null,
                'status' => 'open',
            ]);

            // Share link auto-généré à partir de FRONTEND_URL + uuid.
            // L'uuid est garanti présent après save (setté dans Tournament::booted).
            $t->update([
                'share_link' => rtrim(config('app.frontend_url', 'http://localhost:3000'), '/')
                    .'/tournois/'.$t->uuid,
            ]);

            return $t;
        });

        TournamentCreated::dispatch($tournament);

        return $tournament->fresh(['club', 'creator']);
    }

    /**
     * Mise à jour partielle. Autorisation déjà vérifiée en amont (Policy).
     *
     * @param  array<string,mixed>  $data  Payload validé (UpdateTournamentRequest)
     */
    public function update(Tournament $tournament, array $data): Tournament
    {
        $updates = collect($data)->except('club_uuid')->all();

        if (array_key_exists('club_uuid', $data)) {
            $updates['club_id'] = Club::where('uuid', $data['club_uuid'])->value('id');
        }

        $tournament->update($updates);

        return $tournament->fresh(['club', 'creator']);
    }

    /**
     * Inscription d'une équipe (captain + optional partner).
     * Gère automatiquement :
     *   - validation FFT points vs LEVEL_LIMITS
     *   - détection de conflit (déjà inscrit, comme captain OU partner)
     *   - placement registered vs waitlisted selon capacité
     *   - transition status → full quand max_teams atteint
     *   - lock for update pour race conditions
     */
    public function registerTeam(Tournament $tournament, User $captain, ?string $partnerUuid): TournamentTeam
    {
        if ($tournament->status !== 'open') {
            abort(409, 'Ce tournoi n\'accepte plus d\'inscription.');
        }

        $limit = config('tournaments.level_limits')[$tournament->level] ?? null;

        $captain->loadMissing('profile');
        $captainPoints = (int) ($captain->profile?->padel_points ?? 0);

        if ($limit !== null && $captainPoints > $limit) {
            abort(422, "Ton classement ({$captainPoints} pts) dépasse la limite {$tournament->level} ({$limit} pts).");
        }

        $partner = null;
        $partnerPoints = null;

        if ($partnerUuid) {
            $partner = User::where('uuid', $partnerUuid)->with('profile')->first();
            if (! $partner) {
                abort(422, 'Partenaire introuvable.');
            }
            $partnerPoints = (int) ($partner->profile?->padel_points ?? 0);
            if ($limit !== null && $partnerPoints > $limit) {
                abort(422, "Le classement de {$partner->name} ({$partnerPoints} pts) dépasse la limite {$tournament->level} ({$limit} pts).");
            }
        }

        // Cross-team check : ni captain ni partner ne doivent déjà figurer dans
        // une équipe de ce tournoi (à n'importe quel rôle). MySQL UNIQUE ne
        // couvre que le même rôle ; cette règle cross-rôle est applicative.
        $ids = array_filter([$captain->id, $partner?->id]);
        $conflict = TournamentTeam::where('tournament_id', $tournament->id)
            ->where(function ($q) use ($ids) {
                $q->whereIn('captain_id', $ids)->orWhereIn('partner_id', $ids);
            })
            ->exists();

        if ($conflict) {
            abort(409, 'Toi ou ton partenaire êtes déjà inscrit à ce tournoi.');
        }

        $teamPoints = $captainPoints + ($partnerPoints ?? 0);

        $team = DB::transaction(function () use ($tournament, $captain, $partner, $captainPoints, $partnerPoints, $teamPoints): TournamentTeam {
            // Lock for update → évite les double-inscriptions concurrentes
            // qui passeraient l'une et l'autre le "count < max_teams".
            $t = Tournament::whereKey($tournament->id)->lockForUpdate()->first();
            $registeredCount = $t->registeredTeams()->count();

            $status = $registeredCount < $t->max_teams ? 'registered' : 'waitlisted';

            $team = TournamentTeam::create([
                'tournament_id' => $t->id,
                'captain_id' => $captain->id,
                'partner_id' => $partner?->id,
                'captain_name' => $captain->name,
                'partner_name' => $partner?->name,
                'captain_points' => $captainPoints,
                'partner_points' => $partnerPoints,
                'team_points' => $teamPoints,
                'team_name' => 'Eq. '.$captain->name,
                'status' => $status,
            ]);

            // Si on vient de remplir le tournoi, transition open → full.
            if ($status === 'registered' && ($registeredCount + 1) >= $t->max_teams) {
                $t->update(['status' => 'full']);
            }

            return $team;
        });

        TeamRegistered::dispatch($team);

        return $team->load(['captain:id,uuid', 'partner:id,uuid']);
    }

    /**
     * Désinscription. L'user doit figurer comme captain OU partner.
     * Si l'équipe était `registered`, on promeut automatiquement le 1er
     * `waitlisted` (FIFO) et on recalcule le status du tournoi.
     *
     * @return array{removed: TournamentTeam, promoted: TournamentTeam|null}
     */
    public function unregisterTeam(Tournament $tournament, User $user): array
    {
        return DB::transaction(function () use ($tournament, $user): array {
            $t = Tournament::whereKey($tournament->id)->lockForUpdate()->first();

            $team = TournamentTeam::where('tournament_id', $t->id)
                ->where(function ($q) use ($user) {
                    $q->where('captain_id', $user->id)
                        ->orWhere('partner_id', $user->id);
                })
                ->first();

            if (! $team) {
                abort(404, "Tu n'es inscrit à aucune équipe dans ce tournoi.");
            }

            $wasRegistered = $team->status === 'registered';
            $team->delete();

            $promoted = null;

            if ($wasRegistered) {
                // Promotion FIFO du premier waitlisted (par created_at ASC).
                $promoted = TournamentTeam::where('tournament_id', $t->id)
                    ->where('status', 'waitlisted')
                    ->orderBy('created_at')
                    ->first();

                if ($promoted) {
                    $promoted->update(['status' => 'registered']);
                    // Net count inchangé → status full reste full.
                } elseif ($t->status === 'full') {
                    // Aucun waitlist à promouvoir → il y a un slot libre → full → open.
                    $t->update(['status' => 'open']);
                }
            }

            TeamUnregistered::dispatch($team);
            if ($promoted) {
                TeamPromotedFromWaitlist::dispatch($promoted);
            }

            return ['removed' => $team, 'promoted' => $promoted];
        });
    }

    /**
     * Lance le tournoi (MINIMAL Phase 1).
     *   - Valide min 2 équipes registered
     *   - Transition status → in_progress + launched_at = now
     *   - Dispatch TournamentLaunched → listener stub (Phase 2 : MatchEngine)
     *
     * Autorisation déjà vérifiée en amont par TournamentPolicy::launch.
     */
    public function launch(Tournament $tournament): Tournament
    {
        $registered = $tournament->registeredTeams()->count();

        if ($registered < 2) {
            abort(422, "Minimum 2 équipes inscrites pour lancer le tournoi ({$registered} actuellement).");
        }

        $tournament->update([
            'status' => 'in_progress',
            'launched_at' => now(),
        ]);

        TournamentLaunched::dispatch($tournament);

        return $tournament->fresh(['club', 'creator']);
    }
}
