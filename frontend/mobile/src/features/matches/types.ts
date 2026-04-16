export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'forfeit';
export type MatchPhase = 'poule' | 'bracket' | 'classement';

export interface MatchTeam {
  id: number;
  team_name: string;
  seed: number | null;
}

export interface MatchScore {
  team1_games: number | null;
  team2_games: number | null;
  tiebreak_team1: number | null;
  tiebreak_team2: number | null;
}

export interface TournamentMatch {
  uuid: string;
  phase: MatchPhase;
  bloc: string | null;
  round: number | null;
  match_number: number | null;
  pool_uuid: string | null;
  team1: MatchTeam | null;
  team2: MatchTeam | null;
  score: MatchScore;
  status: MatchStatus;
  validated_by_team1: boolean;
  validated_by_team2: boolean;
  winner: MatchTeam | null;
  court: string | null;
  estimated_time: string | null;
}

export interface PoolStanding {
  team_id: number;
  team_name: string;
  seed: number | null;
  played: number;
  won: number;
  lost: number;
  games_for: number;
  games_against: number;
  game_diff: number;
  points: number;
}

export interface Pool {
  uuid: string;
  pool_name: string;
  pool_type: string;
  team_ids: number[];
  standings: PoolStanding[];
}

export interface RankingEntry {
  position: number;
  team: {
    id: number;
    team_name: string;
    seed: number | null;
    team_points: number;
  };
  wins: number;
  losses: number;
  bloc: string | null;
  final_position: number | null;
  eliminated_at_round: number | null;
}

export interface RankingResponse {
  data: RankingEntry[];
  meta: { status: string; final: boolean };
}
