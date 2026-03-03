import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCn5KaeX-DA3TW7lAmvV79aOvTbU55Bmig',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'wemepet.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'wemepet',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'wemepet.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '702218829530',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:702218829530:web:ff83f0b7414effb1566fe3',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-VYNCZN0H0X',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

let analytics = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      analytics = null;
    });
}

export { auth, provider, analytics };
