'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api/client';

type KoiItem = {
  id: string;
  name: string;
  variety?: string | null;
  status: string;
  media: Array<{ id: string; url: string }>;
  owner: {
    id: string;
    displayName: string;
  };
};

type KoiResponse = {
  items: KoiItem[];
};

export function KoiList() {
  const query = useQuery({
    queryKey: ['koi', 'list'],
    queryFn: () => apiFetch<KoiResponse>('/koi?limit=20'),
  });

  if (query.isPending) {
    return <p className="muted">Loading koi registry...</p>;
  }

  if (query.isError) {
    return <p className="muted">Cannot load koi registry.</p>;
  }

  return (
    <section className="koi-grid">
      {query.data?.items.map((koi) => (
        <article key={koi.id} className="koi-card">
          <div className="koi-cover">
            {koi.media[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={koi.media[0].url} alt={koi.name} loading="lazy" />
            ) : (
              <span className="placeholder">No image</span>
            )}
          </div>
          <h3>{koi.name}</h3>
          <p>{koi.variety ?? 'Unknown variety'}</p>
          <small>Owner: {koi.owner.displayName}</small>
        </article>
      ))}
    </section>
  );
}
