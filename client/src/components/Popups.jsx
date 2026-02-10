import React, { useState, useEffect } from 'react';

export const FullscreenModal = ({ children, onClose, hideCloseButton = false }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
    }}
  >
    <div style={{ position: 'relative' }}>
      {!hideCloseButton && <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '-16px',
          right: '-16px',
          background: 'white',
          borderRadius: '50%',
          border: 'none',
          width: '36px',
          height: '36px',
          cursor: 'pointer',
          fontSize: '1.2rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-main)',
        }}
      >
        <span style={{ lineHeight: 1, fontWeight: 600 }}>×</span>
      </button>}
      {children}
    </div>
  </div>
);

export const LoginPopup = ({ onGoogle, onEmailLogin, onSwitch, onClose, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [resetEmail, setResetEmail] = useState('');

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    fontSize: '0.95rem',
    outline: 'none',
    background: '#f8fafc',
    color: '#1e293b',
  };

  if (mode === 'forgot') {
    return (
      <div style={{ width: '100%', maxWidth: '400px', background: 'white', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
          <button onClick={() => setMode('login')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#64748b' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>Quên mật khẩu</span>
          <div style={{ width: '32px' }}></div>
        </div>
        
        <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem', textAlign: 'center' }}>Nhập email của bạn để nhận liên kết đặt lại mật khẩu.</p>
          <input value={resetEmail} type="email" onChange={(e) => setResetEmail(e.target.value)} placeholder="Email của bạn" style={inputStyle} />
          <button onClick={() => { onForgotPassword(resetEmail); setMode('login'); }} className="btn primary" style={{ width: '100%', borderRadius: '12px', padding: '12px' }}>Gửi liên kết</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '400px', background: 'white', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
        <div style={{ width: '32px' }}></div>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>Đăng nhập</span>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#64748b' }}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '2rem', margin: '0 0 8px', color: '#1e293b' }}>Weme Pet</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Chào mừng bạn quay trở lại!</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input value={email} type="email" onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={inputStyle} />
          <input value={password} type="password" onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" style={inputStyle} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => { setResetEmail(email); setMode('forgot'); }} style={{ border: 'none', background: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer', padding: 0, fontWeight: 500 }}>
              Quên mật khẩu?
            </button>
          </div>
          <button onClick={() => onEmailLogin(email, password)} className="btn primary" style={{ width: '100%', borderRadius: '12px', padding: '12px', marginTop: '4px' }}>Đăng nhập</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94a3b8', fontSize: '0.85rem' }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
          <span>HOẶC</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
        </div>

        <button
          onClick={onGoogle}
          style={{ width: '100%', padding: '12px 24px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#1e293b', fontWeight: 500, transition: 'background 0.2s' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="G" />
          <span>Tiếp tục với Google</span>
        </button>
        <p style={{ textAlign: 'center', margin: '0', fontSize: '0.9rem', color: '#64748b' }}>
          Chưa có tài khoản? <button onClick={onSwitch} style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>Đăng ký ngay</button>
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

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    fontSize: '0.95rem',
    outline: 'none',
    background: '#f8fafc',
    color: '#1e293b',
  };

  return (
    <div style={{ width: '100%', maxWidth: '450px', background: 'white', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
        <div style={{ width: '32px' }}></div>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>Đăng ký</span>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#64748b' }}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', color: '#1e293b' }}>Tạo tài khoản mới</h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Nhanh chóng và dễ dàng.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Họ" style={inputStyle} />
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Tên" style={inputStyle} />
        </div>
        
        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Ngày sinh</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select value={dobDay} onChange={e => setDobDay(e.target.value)} style={inputStyle}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => <option key={day} value={day}>{day}</option>)}
            </select>
            <select value={dobMonth} onChange={e => setDobMonth(e.target.value)} style={inputStyle}>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{`Tháng ${i + 1}`}</option>)}
            </select>
            <select value={dobYear} onChange={e => setDobYear(e.target.value)} style={inputStyle}>
              {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Giới tính</label>
          <div style={{ display: 'flex', gap: '16px' }}>
            {['female','male','custom'].map(value => (
              <label key={value} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input type="radio" checked={gender === value} onChange={() => setGender(value)} style={{ accentColor: '#111827' }} />
                {value === 'female' ? 'Nữ' : value === 'male' ? 'Nam' : 'Tùy chỉnh'}
              </label>
            ))}
          </div>
        </div>

        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" style={inputStyle} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" style={inputStyle} />
        
        <button onClick={() => onRegister({ firstName, lastName, dobDay, dobMonth, dobYear, gender, email, password })} className="btn primary" style={{ width: '100%', borderRadius: '12px', padding: '12px' }}>Đăng ký</button>
        
        <p style={{ textAlign: 'center', margin: '0', fontSize: '0.9rem', color: '#64748b' }}>
          Đã có tài khoản? <button onClick={onSwitch} style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>Đăng nhập</button>
        </p>
      </div>
    </div>
  );
};

export const AvatarUploadPopup = ({ avatarFile, avatarUploading, avatarPreviewSrc, onFileChange, onUpload, onClose }) => (
  <div style={{ width: '100%', maxWidth: '450px', background: 'white', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
      <div style={{ width: '32px' }}></div>
      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>Ảnh đại diện</span>
      <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#64748b' }}>
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
    
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
      <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', textAlign: 'center' }}>Chụp hoặc tải lên ảnh JPG/PNG dưới 5MB.</p>
    <div className="avatar-upload-preview" style={{ margin: '0 auto', borderRadius: '50%', width: '140px', height: '140px', border: '4px solid #e2e8f0' }}>
      {avatarPreviewSrc ? (
        <img src={avatarPreviewSrc} alt="Preview" />
      ) : (
        <span>{avatarFile ? avatarFile.name : 'Chưa có ảnh'}</span>
      )}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input
        id="avatar-upload-input"
        type="file"
        accept="image/*"
        onChange={onFileChange}
        style={{ display: 'none' }}
      />
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <label htmlFor="avatar-upload-input" className="avatar-upload-button ghost" style={{ margin: 0, borderRadius: '12px', padding: '10px 20px', background: '#f1f5f9', color: '#1e293b', border: 'none' }}>
          {avatarFile ? 'Chọn lại ảnh' : 'Chụp/Chọn ảnh'}
        </label>
        <button
          type="button"
          className="avatar-upload-button primary"
          onClick={onUpload}
          disabled={avatarUploading}
          style={{ borderRadius: '12px', padding: '10px 20px' }}
        >
          {avatarUploading ? 'Đang tải...' : 'Cập nhật avatar'}
        </button>
      </div>
      <p className="avatar-upload-file" style={{ marginBottom: 0 }}>
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
    <div style={{ width: '100%', maxWidth: '450px', background: 'white', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
        <div style={{ width: '32px' }}></div>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>Chỉnh sửa tài khoản</span>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#64748b' }}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label style={{ fontWeight: 600 }}>Tên hiển thị</label>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="bio-input"
        placeholder="Họ tên" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px' }}
      />
      <label style={{ fontWeight: 600 }}>Bio</label>
      <textarea
        value={bioValue}
        onChange={(event) => setBioValue(event.target.value)}
        className="bio-input"
        placeholder="Mô tả ngắn về bạn" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px' }}
        rows={3}
      />
      <p style={{ margin: '0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Email: {email}</p>
    </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px', flexWrap: 'wrap' }}>
        <button type="button" className="btn primary" style={{ width: '100%', borderRadius: '12px', padding: '12px' }} onClick={handleSubmit} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thông tin'}</button>
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
    <div style={{ width: '100%', maxWidth: '520px', background: 'white', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
        <div style={{ width: '32px' }}></div>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>{title}</span>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#64748b' }}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm kiếm người dùng..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', background: '#f8fafc', color: '#1e293b' }}
        />
      </div>

      <div style={{ padding: '8px 0', maxHeight: '60vh', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Đang tải...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Không tìm thấy người dùng.</div>
        ) : (
          filteredUsers.map((user) => {
            const isSelf = currentUserEmail && user.email === currentUserEmail;
            const isFollowing = myFollowing?.includes(user.email);
            return (
              <div key={user.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => onUserClick(user.email)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', border: 'none', background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                >
                  <img
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random&color=fff`}
                    alt={user.displayName || user.email}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{user.displayName || user.email?.split('@')[0]}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{user.email}</div>
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
