/**
 * Types miroir des résources backend Laravel — TournamentResource (Phase 1).
 */

export type TournamentStatus = 'open' | 'full' | 'in_progress' | 'completed';
export type TournamentType = 'masculin' | 'feminin' | 'mixte' | 'open';
export type TournamentLevel = 'P25' | 'P50' | 'P100' | 'P250' | 'P500' | 'P1000' | 'P2000';

export interface ClubEmbed {
  uuid: string;
  name: string;
  city: string;
}

export interface TournamentSummary {
  uuid: string;
  name: string;
  location: string | null;
  type: TournamentType;
  level: TournamentLevel;
  date: string | null; // YYYY-MM-DD
  start_time: string | null; // HH:MM
  inscription_deadline: string | null;
  max_teams: number;
  courts_available: number;
  price: string | null;
  share_link: string | null;
  status: TournamentStatus;
  launched_at: string | null;
  created_at: string;
  club?: ClubEmbed;
  teams_count?: number;
  waitlist_count?: number;
}

export interface TournamentsPage {
  data: TournamentSummary[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
