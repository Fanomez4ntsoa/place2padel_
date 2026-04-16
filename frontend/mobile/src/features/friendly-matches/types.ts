export type FriendlyStatus = 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed';

export interface FriendlyUser {
  uuid: string;
  name: string;
  picture_url: string | null;
}

export interface FriendlyParticipant {
  user: FriendlyUser | null;
  slot: number; // 1 ou 2
  is_captain: boolean;
  accepted: boolean;
}

export interface FriendlyScore {
  team1_games: number | null;
  team2_games: number | null;
  tiebreak_team1: number | null;
  tiebreak_team2: number | null;
}

export interface FriendlyMatch {
  uuid: string;
  status: FriendlyStatus;
  creator: FriendlyUser | null;
  team1: FriendlyParticipant[];
  team2: FriendlyParticipant[];
  score: FriendlyScore;
  winner_team: 1 | 2 | null;
  validated_by_team1: boolean;
  validated_by_team2: boolean;
  elo_before: Record<string, number> | null;
  location: string | null;
  started_at: string | null;
  completed_at: string | null;
  result_photo_url: string | null;
  created_at: string;
}

export interface UserElo {
  declared_level: number;
  elo_level: number;
  display_value: number;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  is_locked: boolean;
  matches_to_unlock: number;
  history: EloHistoryEntry[];
  last_updated_at: string | null;
}

export interface EloHistoryEntry {
  match_uuid: string;
  date: string;
  result: 'win' | 'loss';
  opponent_avg_elo: number;
  elo_before: number;
  elo_after: number;
}

export interface MatchHistoryEntry {
  match_uuid: string;
  type: 'friendly' | 'tournament';
  date: string;
  result: 'win' | 'loss';
  score: { team1_games: number; team2_games: number };
  winner_team: 1 | 2 | null;
  my_team: 1 | 2 | null;
}
