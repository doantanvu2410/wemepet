import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { updatePassword } from 'firebase/auth';

const SettingsPage = ({ user }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.email) return;
    const stored = localStorage.getItem(`wemepet-notify-${user.email}`);
    if (stored !== null) {
      setNotificationsEnabled(stored === 'true');
    }
  }, [user?.email]);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    try {
      if (user) {
        await updatePassword(user, newPassword);
        setMessage('Đổi mật khẩu thành công!');
        setError('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi khi đổi mật khẩu. Vui lòng đăng nhập lại và thử lại.');
      setMessage('');
    }
  };

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1>Cài đặt</h1>
          <p>Quản lý tài khoản và tùy chọn ứng dụng.</p>
        </div>
      </div>

      <section className="card section-card">
        <div className="section-title">Đổi mật khẩu</div>
        <div className="form-stack">
          <input className="input-field" type="password" placeholder="Mật khẩu mới" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <input className="input-field" type="password" placeholder="Xác nhận mật khẩu mới" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          {message && <p className="form-message success">{message}</p>}
          {error && <p className="form-message error">{error}</p>}
          <button className="btn primary" onClick={handleChangePassword}>Cập nhật mật khẩu</button>
        </div>
      </section>

      <section className="card section-card">
        <div className="section-title">Thông báo</div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={() => {
              const next = !notificationsEnabled;
              setNotificationsEnabled(next);
              if (user?.email) localStorage.setItem(`wemepet-notify-${user.email}`, String(next));
            }}
          />
          Nhận thông báo qua email và ứng dụng
        </label>
      </section>
    </div>
  );
};

export default SettingsPage;
