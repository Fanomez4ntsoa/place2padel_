<?php

namespace App\Modules\Tournament\Services;

use App\Models\Pool;
use App\Models\TeamState;
use App\Models\Tournament;
use App\Models\TournamentMatch;
use App\Models\TournamentTeam;
use App\Modules\Tournament\Events\TournamentCompleted;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MatchEngineService
{
    // ---------------------------------------------------------------------
    // API publique
    // ---------------------------------------------------------------------

    /**
     * Moteur de reclassement dynamique — à appeler après chaque match validé.
     *
     * Idempotent : si le match n'a pas de winner, ou si son id figure déjà dans
     * le match_history d'un des deux TeamState, on sort silencieusement.
     *
     * Transaction unique englobant reclassement + génération dynamique (point 1
     * de la décision archi : cohérence garantie, acceptable à l'échelle <24 équipes).
     */
    public function reclassifyAfterMatch(TournamentMatch $match): void
    {
        if (! $match->winner_team_id || $match->team2_id === null) {
            return; // pas de winner (match non complété) ou BYE (rien à reclasser).
        }

        DB::transaction(function () use ($match) {
            $tournamentId = $match->tournament_id;
            $winnerId = $match->winner_team_id;
            $loserId = $winnerId === $match->team1_id ? $match->team2_id : $match->team1_id;
            $round = $match->round ?? 0;
            $bloc = $match->bloc ?? 'main';

            $winnerState = TeamState::where('tournament_id', $tournamentId)
                ->where('team_id', $winnerId)
                ->lockForUpdate()
                ->first();
            $loserState = TeamState::where('tournament_id', $tournamentId)
                ->where('team_id', $loserId)
                ->lockForUpdate()
                ->first();

            if (! $winnerState || ! $loserState) {
                Log::warning('[MatchEngine] TeamState manquant — reclassify ignoré', [
                    'match_id' => $match->id,
                    'tournament_id' => $tournamentId,
                ]);
                return;
            }

            // Garde idempotence : si ce match est déjà dans l'historique d'un état,
            // on a déjà reclassé — on sort.
            foreach ($winnerState->match_history ?? [] as $entry) {
                if (($entry['match_id'] ?? null) === $match->id) {
                    return;
                }
            }

            $snapshot = [
                'team1_games' => $match->team1_games,
                'team2_games' => $match->team2_games,
                'tb1' => $match->tiebreak_team1,
                'tb2' => $match->tiebreak_team2,
            ];

            $this->updateTeamStateAfterMatch($winnerState, 'win', $loserId, $match->id, $round, $bloc, $snapshot);
            $this->updateTeamStateAfterMatch($loserState, 'loss', $winnerId, $match->id, $round, $bloc, $snapshot);

            // Winner reste dans son bloc courant ; seul le loser descend.
            $this->moveLoserBloc($loserState, $bloc, $round);

            Log::info('[MatchEngine] Reclassify', [
                'match_id' => $match->id,
                'bloc_source' => $bloc,
                'winner_team_id' => $winnerId,
                'loser_team_id' => $loserId,
                'loser_new_bloc' => $loserState->bloc,
            ]);

            $this->generateDynamicMatches($match->tournament);
        });
    }

    /**
     * Génère les prochains matchs en appariant les équipes du même bloc en attente.
     * Retourne le nb de matchs créés. Finalise le tournoi si plus rien à produire.
     *
     * Appelée depuis reclassifyAfterMatch (dans la même transaction) — ne rouvre pas
     * de transaction interne : si l'appel vient d'ailleurs, le caller doit garantir
     * l'atomicité.
     */
    public function generateDynamicMatches(Tournament $tournament): int
    {
        $grouped = $this->fetchEligibleTeamsGroupedByBloc($tournament);

        $newMatches = 0;
        $teamsById = null;

        foreach ($grouped as $bloc => $states) {
            $pairs = $this->pairGreedyAntiRematch($states);
            if (empty($pairs)) {
                continue;
            }

            // Eager-load des TournamentTeam impliqués (lazy : seulement si au moins une paire existe).
            if ($teamsById === null) {
                $teamsById = TournamentTeam::where('tournament_id', $tournament->id)
                    ->get()
                    ->keyBy('id');
            }

            foreach ($pairs as [$s1, $s2]) {
                $t1 = $teamsById[$s1->team_id] ?? null;
                $t2 = $teamsById[$s2->team_id] ?? null;
                if (! $t1 || ! $t2) {
                    continue;
                }

                $this->createDynamicMatch($tournament, $t1, $t2, $bloc);
                $newMatches++;

                // Les deux équipes sont désormais engagées : la prochaine invocation
                // les exclura via busyTeamIds, mais on flippe waiting_for_match=false
                // pour cohérence d'état immédiate.
                $s1->waiting_for_match = false;
                $s2->waiting_for_match = false;
                $s1->save();
                $s2->save();

                Log::info('[MatchEngine] Dynamic pair', [
                    'tournament_id' => $tournament->id,
                    'bloc' => $bloc,
                    'team1_id' => $t1->id,
                    'team2_id' => $t2->id,
                ]);
            }
        }

        $this->finalizeIfExhausted($tournament, $newMatches);

        return $newMatches;
    }

    /**
     * Calcule les standings d'une poule à la volée depuis les matchs complétés.
     * Port de Emergent _calculate_pool_standings (server.py:641).
     *
     * Barème : 2 pts victoire, 1 pt défaite (pas 0 — valorise la présence).
     * Tri : points DESC, game_diff DESC, games_for DESC.
     *
     * @return list<array{team_id:int, team_name:string, seed:?int, played:int, won:int, lost:int, games_for:int, games_against:int, game_diff:int, points:int}>
     */
    public function calculatePoolStandings(\App\Models\Pool $pool): array
    {
        $teamIds = $pool->team_ids ?? [];
        $teams = \App\Models\TournamentTeam::whereIn('id', $teamIds)
            ->get(['id', 'team_name', 'seed'])
            ->keyBy('id');
        $standings = [];
        foreach ($teamIds as $id) {
            $team = $teams->get($id);
            $standings[$id] = [
                'team_id' => $id,
                'team_name' => $team?->team_name ?? '',
                'seed' => $team?->seed,
                'played' => 0, 'won' => 0, 'lost' => 0,
                'games_for' => 0, 'games_against' => 0,
                'game_diff' => 0, 'points' => 0,
            ];
        }

        $matches = $pool->matches()->where('status', 'completed')->get();
        foreach ($matches as $m) {
            $t1 = $m->team1_id;
            $t2 = $m->team2_id;
            $g1 = $m->team1_games ?? 0;
            $g2 = $m->team2_games ?? 0;
            if (isset($standings[$t1])) {
                $standings[$t1]['played']++;
                $standings[$t1]['games_for'] += $g1;
                $standings[$t1]['games_against'] += $g2;
            }
            if (isset($standings[$t2])) {
                $standings[$t2]['played']++;
                $standings[$t2]['games_for'] += $g2;
                $standings[$t2]['games_against'] += $g1;
            }
            $winnerId = $m->winner_team_id;
            $loserId = $winnerId === $t1 ? $t2 : $t1;
            if ($winnerId && isset($standings[$winnerId])) {
                $standings[$winnerId]['won']++;
                $standings[$winnerId]['points'] += 2;
            }
            if ($loserId && isset($standings[$loserId])) {
                $standings[$loserId]['lost']++;
                $standings[$loserId]['points'] += 1;
            }
        }

        foreach ($standings as &$s) {
            $s['game_diff'] = $s['games_for'] - $s['games_against'];
        }
        unset($s);

        $rows = array_values($standings);
        usort($rows, fn ($a, $b) => [$b['points'], $b['game_diff'], $b['games_for']]
            <=> [$a['points'], $a['game_diff'], $a['games_for']]);
        return $rows;
    }

    /**
     * Point d'entrée au launch — orchestre tout.
     *
     * 1. Charge les équipes registered, triées par team_points DESC
     * 2. Assigne seed = i+1
     * 3. recommendFormat selon num_teams
     * 4. initTeamStates (tous formats, décision archi)
     * 5. Dispatch : generateBracket | generatePoules selon le format
     * 6. Bascule tournament.status → 'in_progress'
     *
     * Caller attendu : GenerateMatchesJob (queue high), déclenché par l'event
     * TournamentLaunched. Le caller DOIT wrapper dans DB::transaction.
     *
     * Guard : throw si < 2 équipes ou si des matchs existent déjà (re-run accidentel).
     */
    public function generateInitial(Tournament $tournament): void
    {
        $teams = $tournament->registeredTeams()
            ->orderByDesc('team_points')
            ->orderBy('id') // tie-break stable
            ->get();

        if ($teams->count() < 2) {
            throw new \DomainException('Il faut au moins 2 équipes pour générer le tournoi.');
        }

        if ($tournament->matches()->exists()) {
            throw new \LogicException("Tournoi {$tournament->id} a déjà des matchs — generateInitial refuse le re-run.");
        }

        // Seeding : 1 = meilleure équipe. Persisté pour affichage + cohérence avec Emergent.
        foreach ($teams as $i => $team) {
            $team->seed = $i + 1;
            $team->save();
        }

        $rec = $this->recommendFormat($teams->count());

        $this->initTeamStates($tournament, $teams);

        match ($rec['format']) {
            'elimination_directe' => $this->generateBracket($tournament, $teams),
            'poules', 'poules_classement', 'poules_tableau'
                => $this->generatePoules($tournament, $teams, $rec['pools']),
        };

        $tournament->status = 'in_progress';
        $tournament->save();

        Log::info('[MatchEngine] Initial généré', [
            'tournament_id' => $tournament->id,
            'format' => $rec['format'],
            'teams' => $teams->count(),
            'description' => $rec['description'],
        ]);
    }

    // ---------------------------------------------------------------------
    // Helpers privés
    // ---------------------------------------------------------------------

    /**
     * Puissance de 2 supérieure ou égale à $n. Utilisée pour dimensionner le bracket.
     * Ex: 5→8, 8→8, 9→16. Garanti ≥ 1 (n=0 ou 1 → 1).
     *
     * engine_meta reconstitué à la volée (décision archi point 2) :
     *   bracket_size = nextPowerOfTwo($n)
     *   num_rounds   = (int) log2(bracket_size)
     */
    private function nextPowerOfTwo(int $n): int
    {
        if ($n <= 1) {
            return 1;
        }
        $size = 1;
        while ($size < $n) {
            $size *= 2;
        }
        return $size;
    }

    /**
     * Positions de seeding récursives (algo Emergent server.py:924).
     *
     *   seedPositions(1) = [0]
     *   seedPositions(2) = [0, 1]
     *   seedPositions(4) = [0, 2, 1, 3]
     *   seedPositions(8) = [0, 4, 2, 6, 1, 5, 3, 7]
     *
     * Les équipes triées par points sont placées dans les slots du bracket via
     * $slots[$positions[$i]] = $teams[$i]. $size DOIT être une puissance de 2
     * (caller = generateBracket qui a déjà appliqué nextPowerOfTwo).
     */
    /**
     * Génère les poules initiales + round-robin complet (Emergent server.py:735-782).
     *
     * Pré-requis : $teams triée par team_points DESC, seed assigné par generateInitial.
     * initTeamStates() DOIT avoir été appelé avant (tous formats — décision archi).
     *
     * Pour chaque poule : création d'une ligne Pool (pool_type='initial'),
     * génération de tous les matchs C(n,2) en phase='poule', round=0.
     * match_number incrémental global sur le tournoi.
     *
     * Ne rouvre pas de transaction — caller (generateInitial) la gère.
     */
    private function generatePoules(Tournament $tournament, Collection $teams, int $numPools): void
    {
        // Fallback défensif : si moins d'équipes que de poules (ex: recommandé 2 poules mais 1 seule équipe restante), rabattre sur 1 poule.
        if ($teams->count() < $numPools) {
            $numPools = 1;
        }

        $poolLists = $this->distributeTeamsToPoolsSerpentin($teams, $numPools);
        $matchNumber = 0;

        foreach ($poolLists as $idx => $poolTeams) {
            $letter = chr(65 + $idx); // A, B, C...
            $pool = Pool::create([
                'tournament_id' => $tournament->id,
                'pool_name' => "Poule {$letter}",
                'pool_type' => 'initial',
                'team_ids' => array_map(fn ($t) => $t->id, $poolTeams),
                'standings' => [],
            ]);

            // Round-robin complet : toutes les combinaisons C(n,2).
            $count = count($poolTeams);
            for ($i = 0; $i < $count; $i++) {
                for ($j = $i + 1; $j < $count; $j++) {
                    $matchNumber++;
                    TournamentMatch::create([
                        'tournament_id' => $tournament->id,
                        'pool_id' => $pool->id,
                        'phase' => 'poule',
                        'bloc' => 'main',
                        'round' => 0,
                        'match_number' => $matchNumber,
                        'team1_id' => $poolTeams[$i]->id,
                        'team2_id' => $poolTeams[$j]->id,
                        'status' => 'pending',
                    ]);
                }
            }
        }

        Log::info('[MatchEngine] Poules générées', [
            'tournament_id' => $tournament->id,
            'teams' => $teams->count(),
            'pools' => $numPools,
            'total_matches' => $matchNumber,
        ]);
    }

    /**
     * Crée le round 1 d'un bracket à élimination directe (Emergent server.py:917).
     * Les rounds suivants sont générés dynamiquement par generateDynamicMatches
     * après chaque match validé (pas de bracket figé).
     *
     * Pré-requis : $teams triée par team_points DESC, seed déjà assigné (fait par
     * generateInitial). initTeamStates() DOIT avoir été appelé avant.
     *
     * BYEs : équipes sans adversaire au R1 reçoivent wins=1 + push match_history
     * {round, result:'bye'} directement sur leur TeamState, pas de match créé.
     *
     * Ne rouvre pas de transaction — caller (generateInitial) la gère.
     */
    private function generateBracket(Tournament $tournament, Collection $teams): void
    {
        $n = $teams->count();
        $bracketSize = $this->nextPowerOfTwo($n);
        $numRounds = (int) log($bracketSize, 2);
        $positions = $this->seedPositions($bracketSize);

        // Remplit les slots : index = position dans le bracket, valeur = TournamentTeam (ou null = BYE).
        $slots = array_fill(0, $bracketSize, null);
        $teamsList = $teams->values()->all();
        foreach ($teamsList as $i => $team) {
            $slots[$positions[$i]] = $team;
        }

        $matchNumber = 0;

        // Parcours des paires (0,1) (2,3) ... pour générer R1 + BYEs.
        for ($i = 0; $i < $bracketSize; $i += 2) {
            $t1 = $slots[$i];
            $t2 = $slots[$i + 1];

            if ($t1 && $t2) {
                $matchNumber++;
                TournamentMatch::create([
                    'tournament_id' => $tournament->id,
                    'pool_id' => null,
                    'phase' => 'bracket',
                    'bloc' => 'main',
                    'round' => $numRounds,
                    'match_number' => $matchNumber,
                    'team1_id' => $t1->id,
                    'team2_id' => $t2->id,
                    'status' => 'pending',
                ]);
                continue;
            }

            // BYE : une seule équipe sur la paire → victoire gratuite, pas de match créé.
            $byeTeam = $t1 ?? $t2;
            if ($byeTeam === null) {
                continue; // paire vide (n'arrive pas avec seedPositions standard, guard défensif).
            }

            $state = TeamState::where('tournament_id', $tournament->id)
                ->where('team_id', $byeTeam->id)
                ->first();
            if (! $state) {
                // initTeamStates doit avoir été appelé avant — guard défensif.
                continue;
            }

            $state->wins += 1;
            $history = $state->match_history ?? [];
            $history[] = [
                'round' => $numRounds,
                'result' => 'bye',
            ];
            $state->match_history = $history;
            $state->save();
        }

        Log::info('[MatchEngine] Bracket généré', [
            'tournament_id' => $tournament->id,
            'teams' => $n,
            'bracket_size' => $bracketSize,
            'num_rounds' => $numRounds,
            'r1_matches' => $matchNumber,
            'byes' => $bracketSize - $n,
        ]);
    }

    /**
     * Initialise un TeamState par équipe (tous formats — décision archi point 1).
     * Idempotent via updateOrCreate : re-launch ou retry du Job n'empile pas de doublons
     * (UNIQUE (tournament_id, team_id) au niveau DB garantit aussi ça).
     *
     * Tous les states démarrent bloc='main', waiting_for_match=true. Le serpentin ne
     * change pas le bloc initial — il n'influence que la distribution des poules.
     */
    private function initTeamStates(Tournament $tournament, Collection $teams): void
    {
        foreach ($teams as $team) {
            TeamState::updateOrCreate(
                [
                    'tournament_id' => $tournament->id,
                    'team_id' => $team->id,
                ],
                [
                    'wins' => 0,
                    'losses' => 0,
                    'bloc' => 'main',
                    'waiting_for_match' => true,
                    'opponents_played' => [],
                    'match_history' => [],
                    'eliminated_at_round' => null,
                    'final_position' => null,
                ],
            );
        }
    }

    /**
     * Format auto selon nb équipes (Emergent server.py:582).
     * num_courts n'influence pas la logique côté Emergent — non pris en paramètre ici.
     *
     * Retourne ['format' => string, 'pools' => int, 'teams_per_pool' => int, 'description' => string].
     * format ∈ {poules, poules_classement, poules_tableau, elimination_directe}.
     *
     * Caller doit garantir $numTeams >= 2 (validation en amont dans generateInitial).
     */
    private function recommendFormat(int $numTeams): array
    {
        if ($numTeams <= 4) {
            return ['format' => 'poules', 'pools' => 1, 'teams_per_pool' => $numTeams,
                'description' => "Poule unique de {$numTeams} (round-robin)"];
        }
        if ($numTeams <= 6) {
            return ['format' => 'poules_classement', 'pools' => 2, 'teams_per_pool' => 3,
                'description' => '2 poules + classement'];
        }
        if ($numTeams === 7) {
            return ['format' => 'poules_classement', 'pools' => 2, 'teams_per_pool' => 4,
                'description' => '2 poules (3+4) + classement'];
        }
        if ($numTeams === 8) {
            return ['format' => 'elimination_directe', 'pools' => 0, 'teams_per_pool' => 0,
                'description' => 'Tableau 8 équipes'];
        }
        if ($numTeams === 9) {
            return ['format' => 'poules_classement', 'pools' => 3, 'teams_per_pool' => 3,
                'description' => '3 poules de 3 + poules de classement (1ers, 2es, 3es)'];
        }
        if ($numTeams <= 12) {
            // Emergent : 10,11 → 4 poules ; 12 → 3 poules.
            $pools = $numTeams === 12 ? 3 : 4;
            $tpp = intdiv($numTeams, $pools);
            return ['format' => 'poules_tableau', 'pools' => $pools, 'teams_per_pool' => $tpp,
                'description' => "{$pools} poules de {$tpp} + tableau final"];
        }
        if ($numTeams <= 16) {
            return ['format' => 'elimination_directe', 'pools' => 0, 'teams_per_pool' => 0,
                'description' => "Tableau {$numTeams} équipes"];
        }
        if ($numTeams <= 24) {
            $pools = intdiv($numTeams, 4);
            $tpp = intdiv($numTeams, $pools);
            return ['format' => 'poules_tableau', 'pools' => $pools, 'teams_per_pool' => $tpp,
                'description' => "{$pools} poules de {$tpp} + tableau"];
        }
        return ['format' => 'elimination_directe', 'pools' => 0, 'teams_per_pool' => 0,
            'description' => 'Tableau 32 équipes'];
    }

    /**
     * Distribution serpentin (Emergent server.py:606). Équités les poules par seed.
     * Les équipes DOIVENT être pré-triées par team_points DESC par le caller.
     * Ne modifie pas les équipes (pure) — le seed est assigné en amont par generateInitial.
     *
     * Ex: 6 équipes (seeds 1..6), 2 poules → A=[1,4,5], B=[2,3,6]
     *   i=0 cycle=0 idx=0 → A[1]
     *   i=1 cycle=0 idx=1 → B[2]
     *   i=2 cycle=1 idx=1→0 → B[3]   (inverse en cycle impair)
     *   i=3 cycle=1 idx=0→1 → A[4]
     *   i=4 cycle=2 idx=0 → A[5]
     *   i=5 cycle=2 idx=1 → B[6]
     *
     * @return array<int, list<\App\Models\TournamentTeam>>  index 0..numPools-1 → équipes
     */
    private function distributeTeamsToPoolsSerpentin(Collection $teams, int $numPools): array
    {
        $pools = array_fill(0, $numPools, []);
        $i = 0;
        foreach ($teams as $team) {
            $cycle = intdiv($i, $numPools);
            $idx = $i % $numPools;
            if ($cycle % 2 === 1) {
                $idx = $numPools - 1 - $idx;
            }
            $pools[$idx][] = $team;
            $i++;
        }
        return $pools;
    }

    private function seedPositions(int $size): array
    {
        if ($size <= 1) {
            return [0];
        }
        $half = $this->seedPositions(intdiv($size, 2));
        $result = [];
        foreach ($half as $x) {
            $result[] = $x * 2;
        }
        foreach ($half as $x) {
            $result[] = $x * 2 + 1;
        }
        return $result;
    }

    /**
     * Incrémente wins/losses + push score snapshot + opponent dans le JSON
     * (cast array → réassignation, pas d'équivalent $push atomique Mongo côté MySQL).
     */
    private function updateTeamStateAfterMatch(
        TeamState $state,
        string $result,
        int $opponentTeamId,
        int $matchId,
        int $round,
        string $bloc,
        array $scoreSnapshot,
    ): void {
        if ($result === 'win') {
            $state->wins += 1;
        } else {
            $state->losses += 1;
        }

        $opponents = $state->opponents_played ?? [];
        $opponents[] = $opponentTeamId;
        $state->opponents_played = $opponents;

        $history = $state->match_history ?? [];
        $history[] = [
            'match_id' => $matchId,
            'round' => $round,
            'bloc' => $bloc,
            'result' => $result,
            'opponent' => $opponentTeamId,
            'score' => $scoreSnapshot,
        ];
        $state->match_history = $history;

        $state->waiting_for_match = true;
        $state->save();
    }

    /**
     * main → classement_R{round} + eliminated_at_round.
     * Bloc de classement → descend vers {bloc}_L{losses}.
     */
    private function moveLoserBloc(TeamState $loserState, string $currentBloc, int $currentRound): void
    {
        if ($currentBloc === 'main') {
            $loserState->bloc = "classement_R{$currentRound}";
            $loserState->eliminated_at_round = $currentRound;
        } else {
            $loserState->bloc = "{$currentBloc}_L{$loserState->losses}";
        }
        $loserState->save();
    }

    /**
     * Retourne ['bloc' => [TeamState, ...]].
     * Exclut : équipes finalisées, équipes déjà engagées dans un match pending/in_progress,
     * équipes ayant atteint le cap de matchs.
     */
    private function fetchEligibleTeamsGroupedByBloc(Tournament $tournament): array
    {
        $maxMatches = $this->maxMatchesPerTeam($tournament);

        // Une seule requête pour identifier les équipes déjà engagées (anti N+1).
        $busyTeamIds = TournamentMatch::query()
            ->where('tournament_id', $tournament->id)
            ->whereIn('status', ['pending', 'in_progress'])
            ->get(['team1_id', 'team2_id'])
            ->flatMap(fn ($m) => array_filter([$m->team1_id, $m->team2_id]))
            ->unique()
            ->all();

        $states = TeamState::query()
            ->where('tournament_id', $tournament->id)
            ->whereNull('final_position')
            ->where('waiting_for_match', true)
            ->whereNotIn('team_id', $busyTeamIds)
            ->get();

        $grouped = [];
        foreach ($states as $state) {
            // Cap atteint → retirer de la file et ne pas regrouper.
            if (count($state->match_history ?? []) >= $maxMatches) {
                $state->waiting_for_match = false;
                $state->save();
                continue;
            }
            $grouped[$state->bloc][] = $state;
        }

        return $grouped;
    }

    /**
     * Appariement greedy : tri (wins DESC, team_points DESC) puis saute les rematches.
     * Retourne [[TeamState t1, TeamState t2], ...].
     */
    private function pairGreedyAntiRematch(array $teamStates): array
    {
        if (count($teamStates) < 2) {
            return [];
        }

        // team_points vit sur TournamentTeam — eager load pour le tri.
        $teamIds = array_map(fn ($s) => $s->team_id, $teamStates);
        $pointsByTeamId = TournamentTeam::query()
            ->whereIn('id', $teamIds)
            ->pluck('team_points', 'id')
            ->all();

        usort($teamStates, function (TeamState $a, TeamState $b) use ($pointsByTeamId) {
            return [$b->wins, $pointsByTeamId[$b->team_id] ?? 0]
                <=> [$a->wins, $pointsByTeamId[$a->team_id] ?? 0];
        });

        $paired = [];
        $pairs = [];

        for ($i = 0; $i < count($teamStates); $i++) {
            $t1 = $teamStates[$i];
            if (isset($paired[$t1->team_id])) {
                continue;
            }
            for ($j = $i + 1; $j < count($teamStates); $j++) {
                $t2 = $teamStates[$j];
                if (isset($paired[$t2->team_id])) {
                    continue;
                }
                if (in_array($t2->team_id, $t1->opponents_played ?? [], true)) {
                    continue;
                }
                $pairs[] = [$t1, $t2];
                $paired[$t1->team_id] = true;
                $paired[$t2->team_id] = true;
                break;
            }
        }

        return $pairs;
    }

    /**
     * Insert match dynamique : round=0, match_number=0 (non figés dans le bracket).
     * phase='bracket' si bloc main, sinon 'classement'.
     */
    private function createDynamicMatch(
        Tournament $tournament,
        TournamentTeam $team1,
        TournamentTeam $team2,
        string $bloc,
    ): TournamentMatch {
        return TournamentMatch::create([
            'tournament_id' => $tournament->id,
            'pool_id' => null,
            'phase' => $bloc === 'main' ? 'bracket' : 'classement',
            'bloc' => $bloc,
            'round' => 0,
            'match_number' => 0,
            'team1_id' => $team1->id,
            'team2_id' => $team2->id,
            'status' => 'pending',
        ]);
    }

    /**
     * Emergent : 4 matchs max si ≤16 équipes, sinon 5. Cap sur la profondeur de reclassement.
     */
    private function maxMatchesPerTeam(Tournament $tournament): int
    {
        $count = $tournament->registeredTeams()->count();
        return $count <= 16 ? 4 : 5;
    }

    /**
     * Si plus aucun match ne peut être généré ET aucun pending → on finalise.
     * Assigne final_position (tri wins DESC, losses ASC, team_points DESC),
     * bascule status='completed' et dispatch TournamentCompleted.
     */
    private function finalizeIfExhausted(Tournament $tournament, int $newMatches): void
    {
        if ($newMatches > 0) {
            return;
        }

        $pending = TournamentMatch::query()
            ->where('tournament_id', $tournament->id)
            ->whereIn('status', ['pending', 'in_progress'])
            ->exists();
        if ($pending) {
            return;
        }

        $unranked = TeamState::query()
            ->where('tournament_id', $tournament->id)
            ->whereNull('final_position')
            ->get();
        if ($unranked->isEmpty()) {
            return;
        }

        $pointsByTeamId = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->pluck('team_points', 'id')
            ->all();

        $sorted = $unranked->sort(function (TeamState $a, TeamState $b) use ($pointsByTeamId) {
            return [$b->wins, -$a->losses, $pointsByTeamId[$b->team_id] ?? 0]
                <=> [$a->wins, -$b->losses, $pointsByTeamId[$a->team_id] ?? 0];
        })->values();

        // Position de départ = nb d'équipes déjà classées + 1.
        $position = TeamState::query()
            ->where('tournament_id', $tournament->id)
            ->whereNotNull('final_position')
            ->count() + 1;

        foreach ($sorted as $state) {
            $state->final_position = $position++;
            $state->waiting_for_match = false;
            $state->save();
        }

        $tournament->status = 'completed';
        $tournament->save();

        TournamentCompleted::dispatch($tournament);
    }
}
