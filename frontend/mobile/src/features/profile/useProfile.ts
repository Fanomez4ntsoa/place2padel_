import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export interface ProfileClub {
  uuid: string;
  name: string;
  city: string;
}

export interface ProfilePayload {
  uuid: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  picture_url?: string | null;
  city?: string | null;
  region?: string | null;
  padel_level?: number | null;
  padel_points?: number | null;
  ranking?: number | null;
  club?: ProfileClub | null;
  preferred_levels?: string[];
  availabilities?: number[];
  profile?: {
    bio?: string | null;
    position?: 'left' | 'right' | 'both' | null;
    license_number?: string | null;
  };
}

export function useProfile(uuid: string | undefined) {
  return useQuery<ProfilePayload>({
    queryKey: ['profile', uuid],
    enabled: !!uuid,
    queryFn: async () => {
      const { data } = await api.get(`/profile/${uuid}`);
      return data.data as ProfilePayload;
    },
  });
}

export interface UpdateProfileBody {
  bio?: string;
  city?: string;
  position?: 'left' | 'right' | 'both';
}

export function useUpdateProfile(uuid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateProfileBody) => {
      const { data } = await api.patch('/profile', body);
      return data.data as ProfilePayload;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', uuid] });
    },
  });
}
