export interface Club {
  uuid: string;
  name: string;
  slug: string;
  address: string | null;
  city: string;
  postal_code: string | null;
  department: string | null;
  region: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  courts_count: number | null;
  indoor: boolean | null;
  picture_url: string | null;
  description: string | null;
  club_type: 'associatif' | 'prive' | null;
  owner_id: string | null;
  owner?: { uuid: string; name: string };
  claimed_at: string | null;
  /** Exposé uniquement par GET /clubs/{uuid} (détail), pas par la recherche. */
  subscribers_count?: number;
}

export interface ClubSearchFilters {
  q?: string;
  city?: string;
  region?: string;
  department?: string;
}
