'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFeed, useToggleLike } from '../hooks/use-feed';
import { useAuthStore } from '@/shared/stores/auth.store';

export function FeedList() {
  const token = useAuthStore((state) => state.token);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const feedQuery = useFeed();
  const likeMutation = useToggleLike();

  const items = useMemo(() => feedQuery.data?.pages.flatMap((page) => page.items) ?? [], [feedQuery.data]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
          void feedQuery.fetchNextPage();
        }
      },
      { rootMargin: '300px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [feedQuery]);

  if (feedQuery.isPending) {
    return <p className="muted">Loading feed...</p>;
  }

  if (feedQuery.isError) {
    return <p className="muted">Cannot load feed right now.</p>;
  }

  return (
    <section className="feed-grid">
      {items.map((post) => (
        <article key={post.id} className="post-card">
          <header>
            <h3>{post.author.displayName}</h3>
            <small>{new Date(post.publishedAt).toLocaleString()}</small>
          </header>

          {post.bodyText ? <p>{post.bodyText}</p> : null}

          {post.media.length ? (
            <div className="media-grid">
              {post.media.slice(0, 4).map((media) => (
                <div className="media-item" key={media.id}>
                  {media.kind === 'VIDEO' ? (
                    <video src={media.url} controls preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={media.url} alt="post media" loading="lazy" />
                  )}
                </div>
              ))}
            </div>
          ) : null}

          <footer>
            <div className="stats">
              <span>{post.likeCount} likes</span>
              <span>{post.commentCount} comments</span>
            </div>

            {token ? (
              <button
                className="btn ghost"
                onClick={() => likeMutation.mutate(post.id)}
                disabled={likeMutation.isPending}
              >
                Like
              </button>
            ) : (
              <span className="muted">Login to like</span>
            )}
          </footer>
        </article>
      ))}

      <div ref={sentinelRef} />
      {feedQuery.isFetchingNextPage ? <p className="muted">Loading more...</p> : null}
    </section>
  );
}
