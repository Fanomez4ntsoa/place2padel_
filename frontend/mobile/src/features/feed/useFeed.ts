import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from '@/lib/api';
import { invalidateFeedKeys } from '@/lib/invalidations';

import type { FeedComment, FeedFilter, FeedPost } from './types';

interface FeedPage {
  data: FeedPost[];
  meta: { current_page: number; last_page: number; total: number };
}

export function useFeed(filter: FeedFilter) {
  return useInfiniteQuery<FeedPage>({
    queryKey: ['feed', filter],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get('/feed', {
        params: { filter, page: pageParam as number, per_page: 20 },
      });
      return data as FeedPage;
    },
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
    staleTime: 30_000,
  });
}

/**
 * GET /profile/{uuid}/posts — posts "libres" (tournament_id null) d'un user.
 * Backend : décision produit = masque les posts salon pour garder le fil
 * profil lisible. Pagination identique à /feed.
 */
export function useProfilePosts(uuid: string | undefined) {
  return useInfiniteQuery<FeedPage>({
    queryKey: ['profile-posts', uuid],
    enabled: !!uuid,
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get(`/profile/${uuid}/posts`, {
        params: { page: pageParam as number, per_page: 20 },
      });
      return data as FeedPage;
    },
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
    staleTime: 30_000,
  });
}

export function flattenFeed(data: InfiniteData<FeedPage> | undefined): FeedPost[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.data);
}

/**
 * Toggle like optimiste — met à jour `liked_by_viewer` + `likes_count`
 * dans toutes les pages de feed en cache avant le retour réseau.
 *
 * Invalide également `['profile-posts']` (toutes les instances) pour que
 * la tab Posts du profil reflète le changement au retour sur l'écran.
 */
export function useToggleLike(filter: FeedFilter) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postUuid: string) => {
      const { data } = await api.post(`/posts/${postUuid}/like`);
      return data as { liked: boolean; likes_count: number };
    },
    onMutate: async (postUuid) => {
      await qc.cancelQueries({ queryKey: ['feed', filter] });
      const prev = qc.getQueryData<InfiniteData<FeedPage>>(['feed', filter]);
      if (prev) {
        qc.setQueryData<InfiniteData<FeedPage>>(['feed', filter], {
          ...prev,
          pages: prev.pages.map((page) => ({
            ...page,
            data: page.data.map((p) =>
              p.uuid === postUuid
                ? {
                    ...p,
                    liked_by_viewer: !p.liked_by_viewer,
                    likes_count: p.likes_count + (p.liked_by_viewer ? -1 : 1),
                  }
                : p,
            ),
          })),
        });
      }
      return { prev };
    },
    onError: (_err, _uuid, ctx) => {
      if (ctx?.prev) qc.setQueryData(['feed', filter], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['profile-posts'] });
    },
  });
}

/**
 * POST /posts — création d'un post user. Le backend accepte soit un upload
 * multipart `image` (fichier, max 5 MB, jpg/png/webp), soit une URL déjà
 * calculée dans `image_url` — on utilise FormData dans les deux cas pour
 * homogénéiser l'envoi (Laravel parse indifféremment).
 *
 * Invalide feed + profile-posts au succès pour que le nouveau post apparaisse
 * immédiatement dans /actualites et la tab Posts du profil.
 */
export interface CreatePostPayload {
  text?: string;
  /** Asset RN : { uri, name, type } depuis expo-image-picker. */
  image?: { uri: string; name: string; type: string } | null;
  tournament_uuid?: string | null;
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePostPayload) => {
      const form = new FormData();
      if (payload.text && payload.text.trim().length > 0) {
        form.append('text', payload.text.trim());
      }
      if (payload.image) {
        // Cast identique à useUploadProfilePhoto — RN FormData accepte
        // { uri, name, type } mais la def DOM standard ne le connaît pas.
        form.append('image', payload.image as unknown as Blob);
      }
      if (payload.tournament_uuid) {
        form.append('tournament_uuid', payload.tournament_uuid);
      }
      const { data } = await api.post('/posts', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as FeedPost;
    },
    onSuccess: () => {
      invalidateFeedKeys(qc);
    },
  });
}

export function usePostComments(postUuid: string | null) {
  return useQuery<FeedComment[]>({
    queryKey: ['post-comments', postUuid],
    enabled: !!postUuid,
    queryFn: async () => {
      const { data } = await api.get(`/posts/${postUuid}/comments`, {
        params: { per_page: 50 },
      });
      return (data?.data ?? []) as FeedComment[];
    },
    staleTime: 15_000,
  });
}

export function useCreateComment(postUuid: string, filter: FeedFilter) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post(`/posts/${postUuid}/comments`, { text });
      return data.data as FeedComment;
    },
    onSuccess: (comment) => {
      qc.setQueryData<FeedComment[]>(['post-comments', postUuid], (old) => [
        ...(old ?? []),
        comment,
      ]);
      const prev = qc.getQueryData<InfiniteData<FeedPage>>(['feed', filter]);
      if (prev) {
        qc.setQueryData<InfiniteData<FeedPage>>(['feed', filter], {
          ...prev,
          pages: prev.pages.map((page) => ({
            ...page,
            data: page.data.map((p) =>
              p.uuid === postUuid ? { ...p, comments_count: p.comments_count + 1 } : p,
            ),
          })),
        });
      }
      // Refresh profile-posts (toutes les instances) — le compteur
      // comments_count est stocké par la resource et doit être à jour
      // à la prochaine visite de la tab Posts du profil.
      qc.invalidateQueries({ queryKey: ['profile-posts'] });
    },
  });
}
