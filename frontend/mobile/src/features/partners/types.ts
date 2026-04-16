import type { AvailabilitySlot } from '@/features/profile/useProfile';

export interface SeekingPartnerUser {
  uuid: string;
  name: string;
  picture_url: string | null;
  position: 'left' | 'right' | 'both' | null;
  padel_points: number | null;
  ranking: number | null;
  /** Club principal (priority=1) — backend projette le premier des clubs multi. */
  club: { name: string; city: string } | null;
  availabilities: AvailabilitySlot[];
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
