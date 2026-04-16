export type GameProposalStatus = 'open' | 'full' | 'cancelled' | 'started';
export type GameProposalResponse = 'pending' | 'accepted' | 'refused';

export interface GPUser {
  uuid: string;
  name: string;
  picture_url: string | null;
}

export interface GameProposalInvitee {
  user: GPUser | null;
  response: GameProposalResponse;
  responded_at: string | null;
}

export interface GameProposal {
  uuid: string;
  status: GameProposalStatus;
  creator: GPUser | null;
  schedule: {
    date: string;
    time: string;
    duration_min: number;
  };
  location: {
    club: string | null;
    city: string | null;
  };
  invitees: GameProposalInvitee[];
  accepted_count: number;
  players_needed: number;
  friendly_match: { uuid: string } | null;
  created_at: string;
}
