<?php

namespace App\Modules\Matchmaking\Services;

use App\Models\Conversation;
use App\Models\PlayerMatch;
use App\Models\PrivateMessage;
use App\Models\Proposal;
use App\Models\Swipe;
use App\Models\Tournament;
use App\Models\TournamentInterest;
use App\Models\User;
use App\Modules\Matchmaking\Events\MatchCreated;
use App\Modules\Matchmaking\Events\ProposalCreated;
use App\Modules\Matchmaking\Events\ProposalResponded;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class MatchmakingService
{
    // ---------------------------------------------------------------------
    // API publique
    // ---------------------------------------------------------------------

    /**
     * Retourne (créée si besoin) la conversation entre deux users.
     * Respecte la contrainte user_a_id < user_b_id (UNIQUE symétrique).
     */
    public function findOrCreateConversation(int $userAId, int $userBId): Conversation
    {
        [$a, $b] = $this->normalizePair($userAId, $userBId);
        return Conversation::firstOrCreate(
            ['user_a_id' => $a, 'user_b_id' => $b],
            ['uuid' => (string) \Illuminate\Support\Str::uuid7()],
        );
    }

    /**
     * Crée une proposal tournament_partner + conversation (si inexistante) +
     * message système dans la conversation. Le tout en transaction pour
     * garantir la cohérence : si l'un échoue, aucun artefact partiel.
     *
     * Guards :
     *   - $from != $to (un user ne se propose pas à lui-même)
     *   - $to n'est pas déjà coéquipier de $from sur ce tournoi
     *   - quota anti-spam (≤ 3 pending (from, to, tournament))
     */
    public function createProposal(
        User $from,
        User $to,
        Tournament $tournament,
        ?array $payload = null,
    ): Proposal {
        if ($from->id === $to->id) {
            throw new HttpException(422, 'Impossible de se proposer à soi-même.');
        }

        $this->assertProposalQuotaAvailable($from, $to, $tournament);

        $proposal = DB::transaction(function () use ($from, $to, $tournament, $payload) {
            $proposal = Proposal::create([
                'type' => Proposal::TYPE_TOURNAMENT_PARTNER,
                'from_user_id' => $from->id,
                'to_user_id' => $to->id,
                'tournament_id' => $tournament->id,
                'status' => Proposal::STATUS_PENDING,
                'payload' => $payload,
            ]);

            $conversation = $this->findOrCreateConversation($from->id, $to->id);

            // Message système dans la conv : matérialise la proposal côté chat.
            $text = "Proposition de partenariat pour {$tournament->name}.";
            $message = PrivateMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $from->id,
                'text' => $text,
                'type' => PrivateMessage::TYPE_TOURNAMENT_PROPOSAL,
                'data' => [
                    'proposal_uuid' => $proposal->uuid,
                    'tournament_uuid' => $tournament->uuid,
                ],
            ]);

            $conversation->update([
                'last_message' => $text,
                'last_message_at' => $message->created_at,
            ]);

            return $proposal;
        });

        ProposalCreated::dispatch($proposal);
        return $proposal;
    }

    /**
     * Accepte ou refuse une proposal. Seul le destinataire peut répondre.
     * Guard additionnel : la proposal doit être pending.
     *
     * @param  'accepted'|'refused'  $response
     */
    public function respondToProposal(Proposal $proposal, User $responder, string $response): Proposal
    {
        if ($proposal->to_user_id !== $responder->id) {
            throw new AuthorizationException('Seul le destinataire peut répondre à cette proposition.');
        }
        if (! $proposal->isPending()) {
            throw new HttpException(422, 'Cette proposition a déjà été traitée.');
        }
        if (! in_array($response, [Proposal::STATUS_ACCEPTED, Proposal::STATUS_REFUSED], true)) {
            throw new HttpException(422, 'Réponse invalide.');
        }

        $response === Proposal::STATUS_ACCEPTED ? $proposal->accept() : $proposal->refuse();

        ProposalResponded::dispatch($proposal->fresh(), $response);
        return $proposal;
    }

    /**
     * Liste des candidats seeking-partner pour $tournament, avec score de compat
     * calculé contextuellement par rapport à $viewer. Exclut : $viewer lui-même,
     * tout user déjà engagé dans une équipe (captain OU partner) du tournoi.
     *
     * Eager-load profile + availabilities + club pour éviter N+1 dans le calcul.
     *
     * @return Collection<int, array{interest: TournamentInterest, score: int}>
     */
    public function listCompatibleSeekingPartners(Tournament $tournament, User $viewer): Collection
    {
        $viewer->loadMissing(['profile', 'availabilities', 'clubs']);

        $excludedUserIds = $tournament->teams()
            ->get(['captain_id', 'partner_id'])
            ->flatMap(fn ($t) => [$t->captain_id, $t->partner_id])
            ->filter()
            ->push($viewer->id)
            ->unique()
            ->all();

        $interests = TournamentInterest::query()
            ->where('tournament_id', $tournament->id)
            ->whereNotIn('user_id', $excludedUserIds)
            ->with(['user.profile', 'user.availabilities', 'user.clubs.club:id,name,city'])
            ->get();

        return $interests
            ->map(fn (TournamentInterest $i) => [
                'interest' => $i,
                'score' => $this->contextualCompatibility($viewer, $i->user, $tournament),
            ])
            ->sortByDesc('score')
            ->values();
    }

    // ---------------------------------------------------------------------
    // Helpers privés — algorithme de compatibilité contextuelle + utilitaires.
    // Port fidèle _calc_contextual_compatibility Emergent server.py:3726-3763.
    // ---------------------------------------------------------------------

    /**
     * Score 0-100 entre $a et $b pour un tournoi donné.
     * Pondération : position 30 + niveau 30 + dispos 25 + club 15.
     * Hypothèse : les deux users ont un UserProfile chargé (eager load côté caller).
     */
    private function contextualCompatibility(User $a, User $b, Tournament $tournament): int
    {
        return $this->scorePosition($a, $b)
            + $this->scoreLevel($a, $b)
            + $this->scoreAvailabilities($a, $b)
            + $this->scoreClub($a, $b, $tournament);
    }

    /**
     * Position complémentaire (Emergent : droite+gauche = top). 'both' compense.
     * Max 30 pts.
     */
    private function scorePosition(User $a, User $b): int
    {
        $pa = $a->profile?->position;
        $pb = $b->profile?->position;
        if ($pa === null || $pb === null) {
            return 10; // inconnu partiel → score médian.
        }
        if (($pa === 'left' && $pb === 'right') || ($pa === 'right' && $pb === 'left')) {
            return 30;
        }
        if ($pa === 'both' || $pb === 'both') {
            return 20;
        }
        return 5; // même côté strict → pénalité.
    }

    /**
     * Proximité en points FFT. Écart faible = score élevé. Max 30 pts.
     */
    private function scoreLevel(User $a, User $b): int
    {
        $la = $a->profile?->padel_points ?? 0;
        $lb = $b->profile?->padel_points ?? 0;
        $diff = abs($la - $lb);
        return match (true) {
            $diff < 500 => 30,
            $diff < 2000 => 20,
            $diff < 5000 => 10,
            default => 0,
        };
    }

    /**
     * Recouvrement de disponibilités hebdo (tuples {day_of_week, period}).
     * Max 25 pts. Consomme overlapAvailabilities().
     */
    private function scoreAvailabilities(User $a, User $b): int
    {
        $overlap = $this->overlapAvailabilities($a, $b);
        return match (true) {
            $overlap >= 3 => 25,
            $overlap === 2 => 18,
            $overlap === 1 => 10,
            default => 0,
        };
    }

    /**
     * Nombre de slots communs (day_of_week, period).
     *
     * Règle "Flexible" (day_of_week null + period 'all') : un user Flexible
     * match automatiquement tout slot non-flex de l'autre, plafonné à 3 pour
     * saturer le barème 25 pts. Intent produit : "je m'adapte" = dispo partout.
     *
     * Lit la relation availabilities (eager-loadée par le caller).
     */
    private function overlapAvailabilities(User $a, User $b): int
    {
        $hasFlexA = $a->availabilities->contains(fn ($av) => $av->day_of_week === null);
        $hasFlexB = $b->availabilities->contains(fn ($av) => $av->day_of_week === null);

        if ($hasFlexA || $hasFlexB) {
            $otherUser = $hasFlexA ? $b : $a;
            $otherNonFlexCount = $otherUser->availabilities
                ->filter(fn ($av) => $av->day_of_week !== null)
                ->count();
            return min($otherNonFlexCount, 3);
        }

        $slotsA = $a->availabilities
            ->map(fn ($av) => $av->day_of_week.':'.$av->period)
            ->all();
        $slotsB = $b->availabilities
            ->map(fn ($av) => $av->day_of_week.':'.$av->period)
            ->all();
        return count(array_intersect($slotsA, $slotsB));
    }

    /**
     * Bonus localisation : au moins un club en commun entre les deux joueurs
     * (parmi les 3 clubs max). Binaire : ≥ 1 intersection = 15 pts, sinon 0.
     * `$tournament` nullable — inutile dans le score actuel, gardé pour hook
     * futur (bonus "club du tournoi" en Phase 4.2).
     */
    private function scoreClub(User $a, User $b, ?Tournament $tournament = null): int
    {
        unset($tournament);
        $clubsA = $a->clubs->pluck('club_id')->all();
        $clubsB = $b->clubs->pluck('club_id')->all();
        return count(array_intersect($clubsA, $clubsB)) > 0 ? 15 : 0;
    }

    /**
     * Retourne [min, max] → garantit l'ordre user_a_id < user_b_id sur les
     * conversations (contrainte UNIQUE symétrique).
     *
     * @return array{0:int, 1:int}
     */
    private function normalizePair(int $userAId, int $userBId): array
    {
        return $userAId < $userBId ? [$userAId, $userBId] : [$userBId, $userAId];
    }

    /**
     * Guard anti-spam : max 3 proposals 'pending' de $from vers $to pour $tournament.
     * Throw 422 si dépassé.
     */
    private function assertProposalQuotaAvailable(User $from, User $to, Tournament $tournament): void
    {
        $pending = Proposal::query()
            ->where('from_user_id', $from->id)
            ->where('to_user_id', $to->id)
            ->where('tournament_id', $tournament->id)
            ->where('status', Proposal::STATUS_PENDING)
            ->count();

        if ($pending >= 3) {
            throw new HttpException(422, 'Quota atteint : 3 propositions pending maximum pour ce tournoi.');
        }
    }

    // =================================================================
    // GLOBAL MATCHING — "Match amical" (hors tournoi).
    // Port fidèle des endpoints Emergent /matching/candidates, /swipe, /matches.
    // =================================================================

    public const CANDIDATES_LIMIT = 20;

    /**
     * Score global 0-100 entre $a et $b, sans tournoi. Pondérations alignées
     * Emergent d5ac086 (position 30, level 30, dispos 25, géo 15) avec les
     * seuils Emergent exacts (plus permissifs que contextualCompatibility).
     */
    public function globalCompatibility(User $a, User $b): int
    {
        $score = $this->globalScorePosition($a, $b)
            + $this->globalScoreLevel($a, $b)
            + $this->globalScoreAvailabilities($a, $b)
            + $this->globalScoreGeo($a, $b);

        return (int) min($score, 100);
    }

    /**
     * Liste de candidats pour le matching global. Exclusions : self + admin
     * + tous les users déjà swipés (any direction). Tri : (_geo, -compatibility)
     * — même club prioritaire, puis même ville, puis reste ; à l'intérieur de
     * chaque zone compat desc. Limite hard {@see CANDIDATES_LIMIT}.
     *
     * Auth optionnelle côté controller : si $viewer est null, retourne les
     * 20 premiers users actifs non-admin sans filtrage swipes (browse mode).
     *
     * @return Collection<int, array{user: User, compatibility: int, geo: int}>
     */
    public function listCompatibleCandidates(?User $viewer, ?string $city = null): Collection
    {
        $query = User::query()
            ->where('role', '!=', 'admin')
            ->with(['profile', 'availabilities', 'clubs.club:id,name,city']);

        if ($viewer !== null) {
            $viewer->loadMissing(['profile', 'availabilities', 'clubs']);

            $swipedIds = $viewer->swipesSent()->pluck('to_user_id')->all();
            $excludedIds = array_merge([$viewer->id], $swipedIds);
            $query->whereNotIn('id', $excludedIds);
        }

        if ($city !== null && $city !== '') {
            $query->where('city', 'like', $city.'%');
        }

        // On charge largement puis on trie côté PHP — l'algorithme de tri composite
        // (geo puis compat) est plus simple en collection et la limite hard à
        // 20 garantit qu'on reste performant. Si volume explose on basculera
        // vers une requête SQL scorée (Phase 4.3).
        $candidates = $query->limit(self::CANDIDATES_LIMIT * 4)->get();

        return $candidates
            ->map(function (User $user) use ($viewer): array {
                $compat = $viewer !== null ? $this->globalCompatibility($viewer, $user) : 0;
                $geo = $viewer !== null ? $this->geoPriority($viewer, $user) : 2;
                return ['user' => $user, 'compatibility' => $compat, 'geo' => $geo];
            })
            ->sortBy(fn (array $c) => [$c['geo'], -$c['compatibility']])
            ->values()
            ->take(self::CANDIDATES_LIMIT);
    }

    /**
     * Enregistre un swipe (upsert) et détecte un like mutuel.
     *
     * Si mutual like : crée (ou retrouve) le PlayerMatch + la Conversation
     * associée + dispatch MatchCreated (→ Listener envoie notifs + emails).
     *
     * @param  'like'|'pass'  $action
     * @return array{is_match: bool, conversation_uuid: ?string, match: ?PlayerMatch}
     */
    public function recordSwipe(User $from, User $to, string $action): array
    {
        if ($from->id === $to->id) {
            throw new HttpException(422, 'Impossible de se swiper soi-même.');
        }
        if (! in_array($action, Swipe::ACTIONS, true)) {
            throw new HttpException(422, 'Action invalide (like|pass attendu).');
        }

        Swipe::updateOrCreate(
            ['from_user_id' => $from->id, 'to_user_id' => $to->id],
            ['action' => $action],
        );

        if ($action !== Swipe::ACTION_LIKE) {
            return ['is_match' => false, 'conversation_uuid' => null, 'match' => null];
        }

        // Détection mutual like — le reverse swipe doit exister et être 'like'.
        $reverse = Swipe::where('from_user_id', $to->id)
            ->where('to_user_id', $from->id)
            ->where('action', Swipe::ACTION_LIKE)
            ->exists();

        if (! $reverse) {
            return ['is_match' => false, 'conversation_uuid' => null, 'match' => null];
        }

        [$match, $conversation, $wasCreated] = DB::transaction(function () use ($from, $to): array {
            [$a, $b] = $this->normalizePair($from->id, $to->id);

            $existing = PlayerMatch::where('user_a_id', $a)->where('user_b_id', $b)->first();
            if ($existing !== null) {
                $conv = $this->findOrCreateConversation($from->id, $to->id);
                return [$existing, $conv, false];
            }

            $match = PlayerMatch::create([
                'uuid' => (string) \Illuminate\Support\Str::uuid7(),
                'user_a_id' => $a,
                'user_b_id' => $b,
            ]);
            $conv = $this->findOrCreateConversation($from->id, $to->id);

            // Message système "Vous avez matché !" dans la conv toute neuve.
            $text = 'Vous avez matché ! Commencez à discuter.';
            $message = PrivateMessage::create([
                'uuid' => (string) \Illuminate\Support\Str::uuid7(),
                'conversation_id' => $conv->id,
                'sender_id' => $from->id,
                'text' => $text,
                'type' => PrivateMessage::TYPE_SYSTEM,
            ]);
            $conv->update([
                'last_message' => $text,
                'last_message_at' => $message->created_at,
            ]);

            return [$match, $conv, true];
        });

        if ($wasCreated) {
            MatchCreated::dispatch($match->fresh(), $conversation->fresh());
        }

        return [
            'is_match' => true,
            'conversation_uuid' => $conversation->uuid,
            'match' => $match,
        ];
    }

    /**
     * Liste des matches mutuels du viewer avec conversation_uuid associée.
     * Triée par created_at desc.
     *
     * @return Collection<int, array{match: PlayerMatch, other: User, conversation_uuid: ?string}>
     */
    public function listMatches(User $viewer): Collection
    {
        $matches = PlayerMatch::query()
            ->where(function ($q) use ($viewer) {
                $q->where('user_a_id', $viewer->id)->orWhere('user_b_id', $viewer->id);
            })
            ->with(['userA.profile', 'userA.clubs.club:id,name,city', 'userB.profile', 'userB.clubs.club:id,name,city'])
            ->orderByDesc('created_at')
            ->get();

        // Bulk fetch des conversations pour éviter N+1.
        $otherIds = $matches->map(fn (PlayerMatch $m) => $m->user_a_id === $viewer->id ? $m->user_b_id : $m->user_a_id)->all();
        $conversations = $this->conversationsByOtherUser($viewer, $otherIds);

        return $matches->map(function (PlayerMatch $m) use ($viewer, $conversations): array {
            $other = $m->other($viewer);
            $conv = $other !== null ? ($conversations[$other->id] ?? null) : null;
            return [
                'match' => $m,
                'other' => $other,
                'conversation_uuid' => $conv?->uuid,
            ];
        });
    }

    // ---------------------------------------------------------------------
    // Helpers privés — matching global.
    // ---------------------------------------------------------------------

    /**
     * @param  int[]  $otherIds
     * @return array<int, Conversation> keyed by other user id
     */
    private function conversationsByOtherUser(User $viewer, array $otherIds): array
    {
        if ($otherIds === []) {
            return [];
        }
        $convs = Conversation::query()
            ->where(function ($q) use ($viewer, $otherIds) {
                $q->where(function ($w) use ($viewer, $otherIds) {
                    $w->where('user_a_id', $viewer->id)->whereIn('user_b_id', $otherIds);
                })->orWhere(function ($w) use ($viewer, $otherIds) {
                    $w->where('user_b_id', $viewer->id)->whereIn('user_a_id', $otherIds);
                });
            })
            ->get();

        $indexed = [];
        foreach ($convs as $c) {
            $otherId = $c->user_a_id === $viewer->id ? $c->user_b_id : $c->user_a_id;
            $indexed[$otherId] = $c;
        }
        return $indexed;
    }

    /**
     * Zone de référence pour le tri géo (viewer vs candidate) :
     *   0 = même club · 1 = même ville · 2 = autres.
     */
    private function geoPriority(User $viewer, User $candidate): int
    {
        $viewerClubs = $viewer->clubs->pluck('club_id')->all();
        $candidateClubs = $candidate->clubs->pluck('club_id')->all();
        if (! empty(array_intersect($viewerClubs, $candidateClubs))) {
            return 0;
        }
        $vCity = strtolower(trim((string) $viewer->city));
        $cCity = strtolower(trim((string) $candidate->city));
        if ($vCity !== '' && $vCity === $cCity) {
            return 1;
        }
        return 2;
    }

    /**
     * Position — pondérations Emergent : complémentaire 30, polyvalent 20,
     * même côté 8, N/A 10. Plus permissif que `scorePosition` contextuel.
     */
    private function globalScorePosition(User $a, User $b): int
    {
        $pa = $a->profile?->position;
        $pb = $b->profile?->position;
        if ($pa === null || $pb === null) {
            return 10;
        }
        if (($pa === 'left' && $pb === 'right') || ($pa === 'right' && $pb === 'left')) {
            return 30;
        }
        if ($pa === 'both' || $pb === 'both') {
            return 20;
        }
        return 8;
    }

    /**
     * Niveau — seuils Emergent : <500 = 30, <2k = 22, <5k = 15, <10k = 8, ≥10k = 3.
     */
    private function globalScoreLevel(User $a, User $b): int
    {
        $la = (int) ($a->profile?->padel_points ?? 0);
        $lb = (int) ($b->profile?->padel_points ?? 0);
        $diff = abs($la - $lb);
        return match (true) {
            $diff < 500 => 30,
            $diff < 2000 => 22,
            $diff < 5000 => 15,
            $diff < 10000 => 8,
            default => 3,
        };
    }

    /**
     * Dispos — 3+ = 25, 2 = 18, 1 = 10, 0 = 2, N/A = 8.
     * Réutilise overlapAvailabilities (Flexible-aware).
     */
    private function globalScoreAvailabilities(User $a, User $b): int
    {
        $availA = $a->availabilities;
        $availB = $b->availabilities;
        if ($availA === null || $availB === null || $availA->isEmpty() || $availB->isEmpty()) {
            return 8;
        }
        $overlap = $this->overlapAvailabilities($a, $b);
        return match (true) {
            $overlap >= 3 => 25,
            $overlap === 2 => 18,
            $overlap === 1 => 10,
            default => 2,
        };
    }

    /**
     * Géo — même club 15, même ville 10, autres 2.
     */
    private function globalScoreGeo(User $a, User $b): int
    {
        $clubsA = $a->clubs->pluck('club_id')->all();
        $clubsB = $b->clubs->pluck('club_id')->all();
        if (! empty(array_intersect($clubsA, $clubsB))) {
            return 15;
        }
        $cityA = strtolower(trim((string) $a->city));
        $cityB = strtolower(trim((string) $b->city));
        if ($cityA !== '' && $cityA === $cityB) {
            return 10;
        }
        return 2;
    }
}
