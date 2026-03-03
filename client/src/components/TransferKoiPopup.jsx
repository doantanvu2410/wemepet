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

  return (
    <div className="modal-card modal-md">
      <div className="modal-header">
        <div className="modal-spacer" />
        <span className="modal-title">Chuyển nhượng số</span>
        <button onClick={onClose} className="modal-close">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="modal-body gap-20">
      <p className="modal-lead">
        Bắt đầu quy trình Handshake để chuyển quyền sở hữu <strong>{koi.name}</strong>.
      </p>
      
      <div>
        <label className="form-label">Email người nhận</label>
        <input 
          type="email" 
          value={buyerEmail} 
          onChange={(e) => setBuyerEmail(e.target.value)} 
          placeholder="nhap_email_nguoi_mua@example.com" 
          className="input-field"
        />
      </div>

      <div className="info-chip info">
        <strong>Lưu ý:</strong> Hồ sơ cá sẽ bị khóa (trạng thái "Transferring") cho đến khi người nhận chấp nhận hoặc bạn hủy yêu cầu.
      </div>

      <button onClick={handleSubmit} disabled={isSubmitting} className="btn dark full">
        {isSubmitting ? 'Đang xử lý...' : 'Gửi yêu cầu'}
      </button>
      </div>
    </div>
  );
};

export default TransferKoiPopup;
