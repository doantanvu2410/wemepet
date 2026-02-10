import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const Sidebar = ({
  currentUser,
  onLogin,
  onRegister,
  onLogout,
  onSubmit,
  onRegisterKoi,
  currentPath,
  onSettings,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreRef = useRef(null);
  // Email admin hardcode để khớp với App.jsx
  const ADMIN_EMAIL = 'doantanvu2410@gmail.com';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMoreMenu && moreRef.current && !moreRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  return (
    <aside className="app-sidebar">
      <Link to="/" className="sidebar-brand" aria-label="Trở về trang chủ">
        <span className="material-icons-outlined sidebar-icon">pets</span>
      </Link>
      
      <div className="sidebar-content">
        {/* 1. Điều hướng chính */}
        <div className="sidebar-group">
          <Link to="/" className={`sidebar-item ${currentPath === '/' ? 'active' : ''}`}>
            <span className="material-icons-outlined sidebar-icon">home</span>
            <span className="sidebar-label">Bảng tin</span>
          </Link>
          <Link to="/explore" className={`sidebar-item ${currentPath === '/explore' ? 'active' : ''}`}>
            <span className="material-icons-outlined sidebar-icon">explore</span>
            <span className="sidebar-label">Khám phá</span>
          </Link>
          {currentUser && (
            <Link to="/notifications" className={`sidebar-item ${currentPath === '/notifications' ? 'active' : ''}`}>
              <div style={{ position: 'relative', display: 'flex' }}>
                <span className="material-icons-outlined sidebar-icon">notifications</span>
                <span className="notification-badge-dot"></span>
              </div>
              <span className="sidebar-label">Thông báo</span>
            </Link>
          )}
          
          {currentUser ? (
            <Link to="/profile" className={`sidebar-item ${currentPath === '/profile' ? 'active' : ''} sidebar-profile-item`}>
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Avatar" className="sidebar-avatar-small" />
              ) : (
                <span className="material-icons-outlined sidebar-icon">account_circle</span>
              )}
              <span className="sidebar-label" style={{ fontWeight: 600 }}>
                {currentUser.displayName || 'Hồ sơ cá nhân'}
              </span>
            </Link>
          ) : (
            <div className="sidebar-item ghost" onClick={onLogin} style={{ cursor: 'pointer' }}>
              <span className="material-icons-outlined sidebar-icon">lock</span>
              <span className="sidebar-label">Đăng nhập để xem thêm</span>
            </div>
          )}
        </div>

        {/* 2. Phụ trợ & Quản lý */}
        {currentUser && (
          <div className="sidebar-group">
            <div className="sidebar-group-label">Quản lý</div>
            <button type="button" className="sidebar-item" onClick={onRegisterKoi}>
              <span className="material-icons-outlined sidebar-icon">fingerprint</span>
              <span className="sidebar-label">Đăng ký ID Cá Koi</span>
            </button>
            <Link to="/transfers" className={`sidebar-item ${currentPath === '/transfers' ? 'active' : ''}`}>
              <span className="material-icons-outlined sidebar-icon">sync_alt</span>
              <span className="sidebar-label">Chuyển nhượng số</span>
            </Link>
            <Link to="/settings" className={`sidebar-item ${currentPath === '/settings' ? 'active' : ''}`}>
              <span className="material-icons-outlined sidebar-icon">settings</span>
              <span className="sidebar-label">Cài đặt</span>
            </Link>
          </div>
        )}

        {/* 3. Admin */}
        {currentUser?.email === ADMIN_EMAIL && (
          <div className="sidebar-group">
            <div className="sidebar-group-label">Quản trị</div>
            <Link to="/admin" className={`sidebar-item ${currentPath === '/admin' ? 'active' : ''}`}>
              <span className="material-icons-outlined sidebar-icon">admin_panel_settings</span>
              <span className="sidebar-label">Dashboard</span>
            </Link>
          </div>
        )}
      </div>

      <div className="sidebar-bottom">
        {currentUser ? (
          <button
            type="button"
            onClick={onLogout}
            className="sidebar-item danger"
          >
            <span className="material-icons-outlined sidebar-icon">logout</span>
            <span className="sidebar-label">Đăng xuất</span>
          </button>
        ) : (
          <div className="sidebar-auth-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={onLogin}
              className="sidebar-item"
              style={{ justifyContent: 'center', fontWeight: 600 }}
            >
              <span className="sidebar-label">Đăng nhập</span>
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="sidebar-item primary-text"
              style={{ justifyContent: 'center', background: 'var(--brand-color)', color: 'white' }}
            >
              <span className="sidebar-label" style={{ color: 'white' }}>Đăng ký</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
