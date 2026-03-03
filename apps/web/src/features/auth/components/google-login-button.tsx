'use client';

import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/shared/firebase/client';
import { useAuthStore } from '@/shared/stores/auth.store';

export function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  const handleLogin = async () => {
    if (!auth) {
      return;
    }

    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();

      setSession(token, {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) {
      return;
    }

    setLoading(true);
    try {
      await signOut(auth);
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <button className="btn ghost" onClick={handleLogout} disabled={loading}>
        {loading ? 'Signing out...' : 'Sign out'}
      </button>
    );
  }

  return (
    <button className="btn primary" onClick={handleLogin} disabled={loading || !isFirebaseConfigured}>
      {loading ? 'Connecting...' : isFirebaseConfigured ? 'Continue with Google' : 'Configure Firebase first'}
    </button>
  );
}
