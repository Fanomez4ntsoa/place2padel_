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
}

export interface ClubSearchFilters {
  q?: string;
  city?: string;
  region?: string;
  department?: string;
}
