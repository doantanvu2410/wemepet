'use client';

import Link from 'next/link';
import { GoogleLoginButton } from '@/features/auth/components/google-login-button';
import { NotificationBadge } from '@/features/notifications/components/notification-badge';
import { useAuthStore } from '@/shared/stores/auth.store';

export function Topbar() {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-dot" />
        <div>
          <strong>WemePet</strong>
          <small>Series A-ready social marketplace</small>
        </div>
      </div>

      <nav className="menu">
        <Link href="/">Feed</Link>
        <Link href="/koi">Koi Registry</Link>
        <Link href="/transfers">Transfers</Link>
        <Link href="/notifications" className="notification-link">
          Notifications
          {user ? <NotificationBadge /> : null}
        </Link>
      </nav>

      <div className="auth">
        {user ? <span className="user-pill">{user.displayName ?? user.email ?? 'User'}</span> : null}
        <GoogleLoginButton />
      </div>
    </header>
  );
}
