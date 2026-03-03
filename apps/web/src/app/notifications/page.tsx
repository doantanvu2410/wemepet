import { NotificationsList } from '@/features/notifications/components/notifications-list';

export default function NotificationsPage() {
  return (
    <div className="stack">
      <section className="hero compact">
        <h1>Notifications</h1>
        <p>Structured event timeline grouped by user actions.</p>
      </section>
      <NotificationsList />
    </div>
  );
}
