export interface SeekingPartnerUser {
  uuid: string;
  name: string;
  picture_url: string | null;
  position: 'left' | 'right' | 'both' | null;
  padel_points: number | null;
  ranking: number | null;
  club: { name: string; city: string } | null;
  availabilities: number[];
}

export interface SeekingPartner {
  user: SeekingPartnerUser;
  message: string | null;
  compatibility_score: number;
  created_at: string;
}

export interface SeekingPartnersResponse {
  data: SeekingPartner[];
  meta: { authenticated: boolean; count: number };
}

export type PartnerMode = 'amical' | 'tournoi' | 'rencontre';

export type ProposalStatus = 'pending' | 'accepted' | 'refused';
export type ProposalType = 'tournament_partner' | 'match_amical' | 'tournament';
export type ProposalDirection = 'received' | 'sent';

export interface ProposalUser {
  uuid: string;
  name: string;
  picture_url: string | null;
}

export interface ProposalTournament {
  uuid: string;
  name: string;
  level: string;
  date: string | null;
}

export interface Proposal {
  uuid: string;
  type: ProposalType;
  status: ProposalStatus;
  from_user: ProposalUser | null;
  to_user: ProposalUser | null;
  tournament: ProposalTournament | null;
  payload: { message?: string } | null;
  created_at: string;
  updated_at: string;
}

export interface MySeeking {
  tournament: {
    uuid: string | null;
    name: string | null;
    level: string | null;
    date: string | null;
    club: { name: string; city: string } | null;
  };
  message: string | null;
  created_at: string;
}
