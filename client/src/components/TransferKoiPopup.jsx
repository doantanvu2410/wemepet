import React, { useState } from 'react';
import { API_URL } from '../utils';

const TransferKoiPopup = ({ koi, ownerEmail, onSubmit, onClose }) => {
  const [buyerEmail, setBuyerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!buyerEmail) {
      alert('Vui lòng nhập email người nhận!');
      return;
    }
    if (buyerEmail === ownerEmail) {
      alert('Không thể chuyển nhượng cho chính mình!');
      return;
    }

    setIsSubmitting(true);
    fetch(`${API_URL}/transactions/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        koiId: koi.id,
        sellerId: ownerEmail,
        buyerEmail: buyerEmail
      })
    })
    .then(async (res) => {
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    })
    .then(() => {
      alert('Yêu cầu chuyển nhượng đã được gửi!');
      onSubmit();
    })
    .catch(err => {
      console.error(err);
      alert('Lỗi: ' + err.message);
    })
    .finally(() => setIsSubmitting(false));
  };

  // Styles
  const containerStyle = {
    width: '100%',
    maxWidth: '450px',
    background: 'white',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle = {
    padding: '16px 24px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontWeight: 700,
    fontSize: '1.2rem',
    color: '#1e293b',
    background: '#fff',
  };

  const bodyStyle = {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    fontSize: '0.95rem',
    outline: 'none',
    background: '#f8fafc',
    color: '#1e293b',
    boxSizing: 'border-box',
    transition: 'all 0.2s',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ width: '32px' }}></div>
        <span>Chuyển nhượng số</span>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#64748b' }}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div style={bodyStyle}>
      <p style={{ textAlign: 'center', color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
        Bắt đầu quy trình Handshake để chuyển quyền sở hữu <strong>{koi.name}</strong>.
      </p>
      
      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email người nhận</label>
        <input 
          type="email" 
          value={buyerEmail} 
          onChange={(e) => setBuyerEmail(e.target.value)} 
          placeholder="nhap_email_nguoi_mua@example.com" 
          style={inputStyle} 
        />
      </div>

      <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '12px', fontSize: '0.85rem', color: '#1e40af', border: '1px solid #dbeafe' }}>
        <strong>Lưu ý:</strong> Hồ sơ cá sẽ bị khóa (trạng thái "Transferring") cho đến khi người nhận chấp nhận hoặc bạn hủy yêu cầu.
      </div>

      <button 
        onClick={handleSubmit} 
        disabled={isSubmitting}
        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#111827', color: 'white', fontWeight: '600', fontSize: '1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
      >
        {isSubmitting ? 'Đang xử lý...' : 'Gửi yêu cầu'}
      </button>
      </div>
    </div>
  );
};

export default TransferKoiPopup;
