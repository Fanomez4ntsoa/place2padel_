import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { invalidateFeedKeys } from '@/lib/invalidations';

export interface ProfileClub {
  uuid: string;
  name: string;
  city: string;
  priority?: number;
}

export type AvailabilityPeriod = 'morning' | 'afternoon' | 'evening' | 'all';

/** Tuple backend. `day_of_week` null + `period: 'all'` = slot Flexible. */
export interface AvailabilitySlot {
  day_of_week: number | null;
  period: AvailabilityPeriod;
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
  /** Liste ordonnée par priority (1..3). Le principal est `clubs[0]`. */
  clubs?: ProfileClub[];
  preferred_levels?: string[];
  availabilities?: AvailabilitySlot[];
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
  first_name?: string;
  last_name?: string;
  bio?: string | null;
  city?: string | null;
  position?: 'left' | 'right' | 'both' | null;
  padel_level?: number | null;
  /** Array d'UUIDs clubs, ordre = priority. Max 3. Vide = aucun club. */
  clubs?: string[];
  /** Array de tuples. `{day_of_week: null, period: 'all'}` = Flexible. Max 10. */
  availabilities?: AvailabilitySlot[];
  preferred_levels?: string[];
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
      // /me exposé via AuthContext peut contenir clubs[0] → refresh si nécessaire.
    },
  });
}

/**
 * POST /profile/photo — upload multipart de l'avatar. Attend un objet RN
 * compatible (uri + name + type) depuis expo-image-picker (ImagePickerAsset
 * converti via helper côté caller). Invalide le cache profil pour forcer
 * le re-fetch avec la nouvelle picture_url (S3 path absolu).
 */
export function useUploadProfilePhoto(uuid: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (asset: { uri: string; name: string; type: string }) => {
      const form = new FormData();
      // RN FormData accepte le type spécifique `{ uri, name, type }` qui n'est
      // pas dans la def DOM standard — cast pour satisfaire TS sans perdre la
      // sémantique runtime.
      form.append('image', asset as unknown as Blob);
      const { data } = await api.post('/profile/photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as ProfilePayload;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', uuid] });
      // Nouvelle photo → les posts existants affichent encore l'ancienne
      // (author.picture_url dénormalisé dans la resource).
      invalidateFeedKeys(qc);
    },
  });
}

/**
 * Helper — retourne le nom du club principal (priority 1) ou null.
 * Remplace l'ancien `user.club?.name` après migration multi-clubs.
 */
export function primaryClubName(
  user: Pick<ProfilePayload, 'clubs'> | { clubs?: ProfileClub[] | null } | null | undefined,
): string | null {
  if (!user?.clubs || user.clubs.length === 0) return null;
  const sorted = [...user.clubs].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  return sorted[0]?.name ?? null;
}

export function primaryClub(
  user: { clubs?: ProfileClub[] | null } | null | undefined,
): ProfileClub | null {
  if (!user?.clubs || user.clubs.length === 0) return null;
  const sorted = [...user.clubs].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  return sorted[0] ?? null;
}
