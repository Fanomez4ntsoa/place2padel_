/**
 * Coarse category (colonne `type` en VARCHAR libre). Utilisée par FeedService
 * pour filtrer. Liste non exhaustive — on accepte `string` pour forward-compat
 * avec de nouveaux types système ajoutés côté backend sans typage mobile.
 */
export type PostType =
  | 'user'
  | 'system_new_tournament'
  | 'system_result'
  | 'system_welcome'
  | 'system_result_friendly'
  | 'system_tournament_club'
  | string;

/**
 * Classification fine Emergent (colonne `post_type`). Discriminant pour
 * l'affichage dans la carte post (welcome, match_result, …).
 */
export type PostSubType =
  | 'new_player'
  | 'new_competitor'
  | 'match_result'
  | 'tournament_club'
  | 'referee_announcement'
  | string;

/** Hint ratio image (colonne `post_aspect`). null = default 4/5. */
export type PostAspect = 'square' | 'portrait' | 'landscape' | null;

export interface FeedAuthor {
  uuid: string;
  name: string;
  picture_url: string | null;
}

export interface FeedTournament {
  uuid: string;
  name: string;
  club: { name: string; city: string } | null;
}

export interface FeedPost {
  uuid: string;
  type: PostType;
  post_type: PostSubType | null;
  author: FeedAuthor | null;
  text: string | null;
  image_url: string | null;
  metadata: Record<string, unknown> | null;
  post_aspect: PostAspect;
  tournament: FeedTournament | null;
  likes_count: number;
  comments_count: number;
  liked_by_viewer: boolean;
  created_at: string;
}

export interface FeedComment {
  uuid: string;
  user: { uuid: string; name: string; picture_url: string | null } | null;
  text: string;
  created_at: string;
}

export type FeedFilter = 'all' | 'my-tournaments' | 'my-partners' | 'my-clubs';
