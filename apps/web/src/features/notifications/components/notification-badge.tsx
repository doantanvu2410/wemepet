'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api/client';

type UnreadCountResponse = {
  unreadCount: number;
};

export function NotificationBadge() {
  const query = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => apiFetch<UnreadCountResponse>('/notifications/unread-count'),
    refetchInterval: 30_000,
  });

  const unread = query.data?.unreadCount ?? 0;
  if (!unread) {
    return null;
  }

  return <span className="notification-badge">{unread > 99 ? '99+' : unread}</span>;
}
