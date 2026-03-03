'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api/client';

export type FeedMedia = {
  id: string;
  kind: 'IMAGE' | 'VIDEO' | 'CERTIFICATE' | 'AVATAR';
  url: string;
  thumbnailUrl?: string | null;
};

export type FeedItem = {
  id: string;
  bodyText?: string | null;
  likeCount: number;
  commentCount: number;
  publishedAt: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  media: FeedMedia[];
};

type FeedResponse = {
  items: FeedItem[];
  nextCursor: string | null;
};

export const FEED_QUERY_KEY = ['posts', 'feed'];

async function fetchFeed(cursor?: string) {
  const query = new URLSearchParams();
  if (cursor) query.set('cursor', cursor);
  query.set('limit', '10');
  return apiFetch<FeedResponse>(`/posts?${query.toString()}`);
}

export function useFeed() {
  return useInfiniteQuery({
    queryKey: FEED_QUERY_KEY,
    queryFn: ({ pageParam }) => fetchFeed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => apiFetch<{ liked: boolean }>(`/posts/${postId}/likes/toggle`, { method: 'POST' }),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: FEED_QUERY_KEY });
      const previous = queryClient.getQueryData(FEED_QUERY_KEY);

      queryClient.setQueryData(FEED_QUERY_KEY, (oldData: unknown) => {
        const state = oldData as {
          pages?: FeedResponse[];
          pageParams?: unknown[];
        };

        if (!state?.pages) {
          return oldData;
        }

        return {
          ...state,
          pages: state.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === postId
                ? {
                    ...item,
                    likeCount: item.likeCount + 1,
                  }
                : item,
            ),
          })),
        };
      });

      return { previous };
    },
    onError: (_error, _postId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FEED_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
    },
  });
}
