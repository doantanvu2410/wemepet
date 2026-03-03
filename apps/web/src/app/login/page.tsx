'use client';

import { GoogleLoginButton } from '@/features/auth/components/google-login-button';
import { isFirebaseConfigured } from '@/shared/firebase/client';

export default function LoginPage() {
  return (
    <section className="center-card">
      <h1>Login</h1>
      <p>Use Google to obtain Firebase ID token. The API validates JWT from your Firebase JWKS endpoint.</p>
      {!isFirebaseConfigured ? (
        <p className="muted">Firebase config is missing. Fill values in `apps/web/.env.local` first.</p>
      ) : null}
      <GoogleLoginButton />
    </section>
  );
}
