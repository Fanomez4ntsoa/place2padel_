export type PostType = 'user' | 'system' | 'tournament_created' | 'tournament_completed';

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
  author: FeedAuthor | null;
  text: string | null;
  image_url: string | null;
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
