import type { AvailabilitySlot } from '@/features/profile/useProfile';

/**
 * Candidat retourné par GET /matching/candidates (mode amical).
 * `compatibility` et `geo_priority` sont présents uniquement si auth.
 */
export interface MatchingCandidate {
  uuid: string;
  name: string;
  first_name: string | null;
  picture_url: string | null;
  city: string | null;
  club: {
    uuid: string | null;
    name: string;
    city: string;
  } | null;
  position: 'left' | 'right' | 'both' | null;
  padel_points: number | null;
  ranking: number | null;
  bio: string | null;
  availabilities: AvailabilitySlot[];
  compatibility?: number;
  geo_priority?: number;
}

export interface MatchingCandidatesResponse {
  data: MatchingCandidate[];
  meta: { authenticated: boolean; count: number };
}

/**
 * Résultat d'un POST /matching/swipe. `is_match` = true quand le swipe
 * crée ou retrouve un match mutuel ; la conversation est alors disponible.
 */
export interface SwipeResult {
  is_match: boolean;
  conversation_uuid: string | null;
  match_uuid: string | null;
}

/**
 * Élément de GET /matching/matches — match mutuel vu depuis le viewer.
 */
export interface PlayerMatchEntry {
  uuid: string;
  created_at: string;
  conversation_uuid: string | null;
  other: {
    uuid: string;
    name: string;
    first_name: string | null;
    picture_url: string | null;
    city: string | null;
    club: { name: string; city: string } | null;
    position: 'left' | 'right' | 'both' | null;
    padel_points: number | null;
  } | null;
}
