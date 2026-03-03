import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { auth, provider } from './firebaseConfig';
import RegisterKoiPopup from './RegisterKoiPopup';
import Sidebar from './components/Sidebar';
import BottomNavigation from './components/BottomNavigation';
import SubmitKoiPopup from './components/SubmitKoiPopup';
import TransferKoiPopup from './components/TransferKoiPopup';
import { LoginPopup, RegisterPopup, FullscreenModal } from './components/Popups';
import GalleryPage from './pages/GalleryPage';
import NotificationsPage from './pages/NotificationsPage';
import ExplorePage from './pages/ExplorePage';
import TransfersPage from './pages/TransfersPage';
import PostDetailView from './components/PostDetailView';
import KoiDetailPage from './pages/KoiDetailPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { ToastProvider, useToast } from './components/Toast';
import { API_URL } from './utils';

const ADMIN_EMAIL = 'doantanvu2410@gmail.com';
function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showRegisterKoi, setShowRegisterKoi] = useState(false);
  const [transferKoi, setTransferKoi] = useState(null); // State để lưu cá đang được chuyển nhượng
  const [refreshKey, setRefreshKey] = useState(0);
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;
  const routesLocation = backgroundLocation || location;
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        setShowLogin(false);
        setShowRegister(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/users/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }),
    }).catch(() => {});
  }, [user]);

  const handleGoogleLogin = () => {
    signInWithPopup(auth, provider).catch(err => console.error(err));
  };

  const handleLogout = () => {
    signOut(auth).catch(err => console.error(err));
  };

  const handleEmailLogin = (email, password) => {
    signInWithEmailAndPassword(auth, email, password).catch(err => console.error(err));
  };

  const handleForgotPassword = async (email) => {
    if (!email) {
      toast('Vui lòng nhập email!', 'error');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast('Email đặt lại mật khẩu đã được gửi!', 'success');
    } catch (err) {
      console.error(err);
      toast(`Lỗi: ${err.message}`, 'error');
    }
  };

  const handleRegister = async ({ firstName, lastName, email, password }) => {
    const displayName = [firstName, lastName].filter(Boolean).join(' ');
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (credential.user && displayName) {
        await updateProfile(credential.user, { displayName });
      }
      if (displayName && email) {
        try {
          window.localStorage.setItem(`wemepet-name-${email}`, displayName);
        } catch (err) {
          console.error('Không thể lưu tên đăng ký', err);
        }
      }
      setShowRegister(false);
      toast('Đăng ký tài khoản thành công!', 'success');
    } catch (err) {
      console.error(err);
      toast(`Lỗi đăng ký: ${err.message}`, 'error');
    }
  };

  if (loading) {
    return <div className="app-loading">Đang tải hệ thống...</div>;
  }

  return (
    <div className="app-root">
      <Sidebar
        currentUser={user}
        onLogin={() => setShowLogin(true)}
        onRegister={() => setShowRegister(true)}
        onLogout={handleLogout}
        onSubmit={() => setShowSubmit(true)}
        onRegisterKoi={() => setShowRegisterKoi(true)}
        currentPath={location.pathname}
      />
      <BottomNavigation 
        currentUser={user}
        onSubmit={() => setShowSubmit(true)}
        onLogin={() => setShowLogin(true)}
      />
      <main className="app-main">
        <Routes location={routesLocation}>
          <Route
            path="/"
            element={
              <GalleryPage
                refreshKey={refreshKey}
                currentUser={user}
                onSubmit={() => setShowSubmit(true)}
              />
            }
          />
          <Route
            path="/explore"
            element={
              <ExplorePage
                currentUser={user}
                onRegisterKoi={() => setShowRegisterKoi(true)}
              />
            }
          />
          <Route path="/notifications" element={<NotificationsPage currentUser={user} />} />
          <Route path="/transfers" element={<TransfersPage currentUser={user} />} />
          <Route path="/post/:id" element={<PostDetailView currentUser={user} />} />
          <Route path="/koi/:id" element={<KoiDetailPage currentUser={user} onTransfer={(koi) => setTransferKoi(koi)} />} />
          <Route path="/profile" element={<ProfilePage currentUser={user} setUser={setUser} />} />
          <Route path="/profile/:email" element={<ProfilePage currentUser={user} setUser={setUser} />} />
          <Route path="/settings" element={<SettingsPage user={user} />} />
          <Route path="/admin" element={user?.email === ADMIN_EMAIL ? <AdminPage /> : <Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {backgroundLocation && (
        <Routes>
          <Route
            path="/post/:id"
            element={
              <div
                className="post-detail-backdrop"
                onClick={(e) => {
                  if (e.target === e.currentTarget) navigate(-1);
                }}
              >
                <div className="post-detail-wrapper">
                  <button
                    onClick={() => navigate(-1)}
                    className="post-detail-close"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                  <PostDetailView currentUser={user} />
                </div>
              </div>
            }
          />
        </Routes>
      )}
      {showSubmit && (
        <FullscreenModal onClose={() => setShowSubmit(false)} hideCloseButton>
          <SubmitKoiPopup
            ownerEmail={user?.email}
            onClose={() => setShowSubmit(false)}
            onSubmit={() => {
              setShowSubmit(false);
              setRefreshKey((value) => value + 1);
            }}
          />
        </FullscreenModal>
      )}
      {showRegisterKoi && (
        <FullscreenModal onClose={() => setShowRegisterKoi(false)} hideCloseButton>
          <RegisterKoiPopup
            ownerEmail={user?.email}
            onClose={() => setShowRegisterKoi(false)}
            onSubmit={() => {
              setShowRegisterKoi(false);
              setRefreshKey((value) => value + 1);
            }}
          />
        </FullscreenModal>
      )}
      {transferKoi && (
        <FullscreenModal onClose={() => setTransferKoi(null)} hideCloseButton>
          <TransferKoiPopup
            koi={transferKoi}
            ownerEmail={user?.email}
            onClose={() => setTransferKoi(null)}
            onSubmit={() => {
              setTransferKoi(null);
              setRefreshKey(prev => prev + 1); // Refresh lại dữ liệu nếu cần
            }}
          />
        </FullscreenModal>
      )}
      {showLogin && (
        <FullscreenModal onClose={() => setShowLogin(false)} hideCloseButton>
          <LoginPopup
            onGoogle={handleGoogleLogin}
            onEmailLogin={handleEmailLogin}
            onForgotPassword={handleForgotPassword}
            onClose={() => setShowLogin(false)}
            onSwitch={() => {
              setShowLogin(false);
              setShowRegister(true);
            }}
          />
        </FullscreenModal>
      )}
      {showRegister && (
        <FullscreenModal onClose={() => setShowRegister(false)} hideCloseButton>
          <RegisterPopup
            onRegister={handleRegister}
            onClose={() => setShowRegister(false)}
            onSwitch={() => {
              setShowRegister(false);
              setShowLogin(true);
            }}
          />
        </FullscreenModal>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
