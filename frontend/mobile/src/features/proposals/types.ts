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
  date: string;
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
