'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth.store';

type NotificationItem = {
  id: string;
  type: string;
  entityType: string;
  createdAt: string;
  isRead: boolean;
  metadata: Record<string, unknown>;
  actorUser?: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  } | null;
};

type NotificationsResponse = {
  items: NotificationItem[];
};

export function NotificationsList() {
  const token = useAuthStore((state) => state.token);
  const query = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => apiFetch<NotificationsResponse>('/notifications?limit=30'),
    enabled: Boolean(token),
  });

  if (!token) {
    return <p className="muted">Login to see notifications.</p>;
  }

  if (query.isPending) {
    return <p className="muted">Loading notifications...</p>;
  }

  if (query.isError) {
    return <p className="muted">Cannot load notifications.</p>;
  }

  return (
    <div className="notification-list">
      {query.data?.items.map((item) => (
        <article key={item.id} className={`notification-item ${item.isRead ? '' : 'unread'}`}>
          <strong>{item.actorUser?.displayName ?? 'System'}</strong>
          <span>{item.type}</span>
          <small>{new Date(item.createdAt).toLocaleString()}</small>
        </article>
      ))}
    </div>
  );
}
