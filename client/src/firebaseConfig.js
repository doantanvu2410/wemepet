import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyCn5KaeX-DA3TW7lAmvV79aOvTbU55Bmig',
  authDomain: 'wemepet.firebaseapp.com',
  projectId: 'wemepet',
  storageBucket: 'wemepet.firebasestorage.app',
  messagingSenderId: '702218829530',
  appId: '1:702218829530:web:ff83f0b7414effb1566fe3',
  measurementId: 'G-VYNCZN0H0X',
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, analytics };
