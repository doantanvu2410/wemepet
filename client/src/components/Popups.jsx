import React, { useState, useEffect } from 'react';

export const FullscreenModal = ({ children, onClose, hideCloseButton = false }) => (
  <div className="fullscreen-modal">
    <div className="fullscreen-modal-inner">
      {!hideCloseButton && (
        <button onClick={onClose} className="fullscreen-close">
          <span>×</span>
        </button>
      )}
      {children}
    </div>
  </div>
);

export const LoginPopup = ({ onGoogle, onEmailLogin, onSwitch, onClose, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [resetEmail, setResetEmail] = useState('');

  if (mode === 'forgot') {
    return (
      <div className="modal-card modal-sm">
        <div className="modal-header">
          <button onClick={() => setMode('login')} className="modal-close">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="modal-title">Quên mật khẩu</span>
          <div className="modal-spacer" />
        </div>
        
        <div className="modal-body gap-20">
          <p className="helper-text text-center m-0">
            Nhập email của bạn để nhận liên kết đặt lại mật khẩu.
          </p>
          <input value={resetEmail} type="email" onChange={(e) => setResetEmail(e.target.value)} placeholder="Email của bạn" className="input-field" />
          <button onClick={() => { onForgotPassword(resetEmail); setMode('login'); }} className="btn primary full">Gửi liên kết</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-card modal-sm">
      <div className="modal-header">
        <div className="modal-spacer" />
        <span className="modal-title">Đăng nhập</span>
        <button onClick={onClose} className="modal-close">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div className="modal-body gap-20">
        <div className="text-center mb-8">
          <h1 className="auth-title">Weme Pet</h1>
          <p className="auth-subtitle">Chào mừng bạn quay trở lại!</p>
        </div>

        <div className="stack-12">
          <input value={email} type="email" onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input-field" />
          <input value={password} type="password" onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" className="input-field" />
          <div className="row-end">
            <button onClick={() => { setResetEmail(email); setMode('forgot'); }} className="link-muted">
              Quên mật khẩu?
            </button>
          </div>
          <button onClick={() => onEmailLogin(email, password)} className="btn primary full mt-4">Đăng nhập</button>
        </div>

        <div className="divider">
          <div className="divider-line"></div>
          <span>HOẶC</span>
          <div className="divider-line"></div>
        </div>

        <button
          onClick={onGoogle}
          className="btn-google"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="G" />
          <span>Tiếp tục với Google</span>
        </button>
        <p className="text-center text-muted text-sm m-0">
          Chưa có tài khoản? <button onClick={onSwitch} className="link-button">Đăng ký ngay</button>
        </p>
      </div>
    </div>
  );
};

export const RegisterPopup = ({ onRegister, onSwitch, onClose }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dobDay, setDobDay] = useState('1');
  const [dobMonth, setDobMonth] = useState('1');
  const [dobYear, setDobYear] = useState(new Date().getFullYear().toString());
  const [gender, setGender] = useState('female');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="modal-card modal-md">
      <div className="modal-header">
        <div className="modal-spacer" />
        <span className="modal-title">Đăng ký</span>
        <button onClick={onClose} className="modal-close">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="modal-body">
        <div className="text-center mb-8">
          <h2 className="auth-title sm">Tạo tài khoản mới</h2>
          <p className="auth-subtitle">Nhanh chóng và dễ dàng.</p>
        </div>

        <div className="form-grid-2">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Họ" className="input-field" />
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Tên" className="input-field" />
        </div>
        
        <div>
          <label className="field-label">Ngày sinh</label>
          <div className="inline-fields">
            <select value={dobDay} onChange={e => setDobDay(e.target.value)} className="input-field">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => <option key={day} value={day}>{day}</option>)}
            </select>
            <select value={dobMonth} onChange={e => setDobMonth(e.target.value)} className="input-field">
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{`Tháng ${i + 1}`}</option>)}
            </select>
            <select value={dobYear} onChange={e => setDobYear(e.target.value)} className="input-field">
              {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="field-label">Giới tính</label>
          <div className="radio-row">
            {['female','male','custom'].map(value => (
              <label key={value} className="radio-option">
                <input type="radio" checked={gender === value} onChange={() => setGender(value)} />
                {value === 'female' ? 'Nữ' : value === 'male' ? 'Nam' : 'Tùy chỉnh'}
              </label>
            ))}
          </div>
        </div>

        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className="input-field" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" className="input-field" />
        
        <button onClick={() => onRegister({ firstName, lastName, dobDay, dobMonth, dobYear, gender, email, password })} className="btn primary full">Đăng ký</button>
        
        <p className="text-center text-muted text-sm m-0">
          Đã có tài khoản? <button onClick={onSwitch} className="link-button">Đăng nhập</button>
        </p>
      </div>
    </div>
  );
};

export const AvatarUploadPopup = ({ avatarFile, avatarUploading, avatarPreviewSrc, onFileChange, onUpload, onClose }) => (
  <div className="modal-card modal-md">
    <div className="modal-header">
      <div className="modal-spacer" />
      <span className="modal-title">Ảnh đại diện</span>
      <button onClick={onClose} className="modal-close">
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
    
    <div className="modal-body gap-20 centered">
      <p className="helper-text text-center m-0">Chụp hoặc tải lên ảnh JPG/PNG dưới 5MB.</p>
    <div className="avatar-upload-preview lg mx-auto">
      {avatarPreviewSrc ? (
        <img src={avatarPreviewSrc} alt="Preview" />
      ) : (
        <span>{avatarFile ? avatarFile.name : 'Chưa có ảnh'}</span>
      )}
    </div>
    <div className="stack-12">
      <input
        id="avatar-upload-input"
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="file-input-hidden"
      />
      <div className="row-wrap">
        <label htmlFor="avatar-upload-input" className="avatar-upload-button ghost m-0">
          {avatarFile ? 'Chọn lại ảnh' : 'Chụp/Chọn ảnh'}
        </label>
        <button
          type="button"
          className="avatar-upload-button primary"
          onClick={onUpload}
          disabled={avatarUploading}
        >
          {avatarUploading ? 'Đang tải...' : 'Cập nhật avatar'}
        </button>
      </div>
      <p className="avatar-upload-file m-0">
        {avatarFile ? avatarFile.name : 'Chưa chọn ảnh'}
      </p>
    </div>
    </div>
  </div>
);

export const AccountEditPopup = ({ displayName, email, bio, onSave, onClose }) => {
  const [name, setName] = useState(displayName || '');
  const [bioValue, setBioValue] = useState(bio || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(displayName || '');
    setBioValue(bio || '');
  }, [displayName, bio]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('Vui lòng nhập tên hiển thị.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), bio: bioValue });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-card modal-md">
      <div className="modal-header">
        <div className="modal-spacer" />
        <span className="modal-title">Chỉnh sửa tài khoản</span>
        <button onClick={onClose} className="modal-close">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="modal-body">
        <div className="stack-10">
          <label className="field-label">Tên hiển thị</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Họ tên"
            className="input-field"
          />
          <label className="field-label">Bio</label>
          <textarea
            value={bioValue}
            onChange={(event) => setBioValue(event.target.value)}
            placeholder="Mô tả ngắn về bạn"
            className="input-field"
            rows={3}
          />
          <p className="text-muted text-sm m-0">Email: {email}</p>
        </div>
        <div className="form-actions">
          <button type="button" className="btn primary full" onClick={handleSubmit} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thông tin'}</button>
        </div>
      </div>
    </div>
  );
};

export const UserListPopup = ({
  title,
  users,
  loading,
  searchQuery,
  onSearchChange,
  onClose,
  onUserClick,
  currentUserEmail,
  myFollowing,
  onToggleFollow,
}) => {
  const normalizedQuery = (searchQuery || '').toLowerCase();
  const filteredUsers = (users || []).filter((user) => {
    const haystack = `${user.displayName || ''} ${user.email || ''}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  return (
    <div className="modal-card modal-lg">
      <div className="modal-header">
        <div className="modal-spacer" />
        <span className="modal-title">{title}</span>
        <button onClick={onClose} className="modal-close">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="modal-search-bar">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm kiếm người dùng..."
          className="input-field"
        />
      </div>

      <div className="modal-list">
        {loading ? (
          <div className="modal-list-empty">Đang tải...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="modal-list-empty">Không tìm thấy người dùng.</div>
        ) : (
          filteredUsers.map((user) => {
            const isSelf = currentUserEmail && user.email === currentUserEmail;
            const isFollowing = myFollowing?.includes(user.email);
            return (
              <div key={user.email} className="modal-list-item">
                <button
                  type="button"
                  onClick={() => onUserClick(user.email)}
                  className="modal-list-button"
                >
                  <img
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random&color=fff`}
                    alt={user.displayName || user.email}
                    className="modal-list-avatar"
                  />
                  <div>
                    <div className="modal-list-name">{user.displayName || user.email?.split('@')[0]}</div>
                    <div className="modal-list-email">{user.email}</div>
                  </div>
                </button>

                {!isSelf && currentUserEmail && (
                  <button
                    type="button"
                    className={`btn ${isFollowing ? 'secondary' : 'primary'} small`}
                    onClick={() => onToggleFollow(user.email)}
                  >
                    {isFollowing ? 'Bỏ theo dõi' : 'Theo dõi'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
