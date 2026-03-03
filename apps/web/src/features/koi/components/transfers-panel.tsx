'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth.store';

type TransferItem = {
  id: string;
  status: string;
  requestedAt: string;
  koi: {
    id: string;
    name: string;
  };
  fromUser: {
    displayName: string;
  };
  toUser: {
    displayName: string;
  };
};

type TransferResponse = {
  items: TransferItem[];
};

export function TransfersPanel() {
  const token = useAuthStore((state) => state.token);

  const incomingQuery = useQuery({
    queryKey: ['transfers', 'incoming'],
    queryFn: () => apiFetch<TransferResponse>('/transfers/incoming?limit=20'),
    enabled: Boolean(token),
  });

  const historyQuery = useQuery({
    queryKey: ['transfers', 'history'],
    queryFn: () => apiFetch<TransferResponse>('/transfers/history?limit=20'),
    enabled: Boolean(token),
  });

  if (!token) {
    return <p className="muted">Login to manage transfer workflow.</p>;
  }

  if (incomingQuery.isPending || historyQuery.isPending) {
    return <p className="muted">Loading transfers...</p>;
  }

  if (incomingQuery.isError || historyQuery.isError) {
    return <p className="muted">Cannot load transfer data.</p>;
  }

  return (
    <section className="transfer-grid">
      <div className="transfer-col">
        <h2>Incoming</h2>
        {(incomingQuery.data?.items ?? []).map((item) => (
          <article key={item.id} className="transfer-item">
            <strong>{item.koi.name}</strong>
            <span>From {item.fromUser.displayName}</span>
            <small>{item.status}</small>
          </article>
        ))}
      </div>

      <div className="transfer-col">
        <h2>History</h2>
        {(historyQuery.data?.items ?? []).map((item) => (
          <article key={item.id} className="transfer-item">
            <strong>{item.koi.name}</strong>
            <span>
              {item.fromUser.displayName} -> {item.toUser.displayName}
            </span>
            <small>{item.status}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
