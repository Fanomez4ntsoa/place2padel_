import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from '@/lib/api';

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

export function flattenFeed(data: InfiniteData<FeedPage> | undefined): FeedPost[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.data);
}

/**
 * Toggle like optimiste — met à jour `liked_by_viewer` + `likes_count`
 * dans toutes les pages de feed en cache avant le retour réseau.
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
    },
  });
}
