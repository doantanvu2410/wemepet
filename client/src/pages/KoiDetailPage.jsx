import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getImageUrl, API_URL } from '../utils';
import EditKoiPopup from '../components/EditKoiPopup';
import { FullscreenModal } from '../components/Popups';


const KoiDetailPage = ({ currentUser, onTransfer }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [koi, setKoi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingTx, setPendingTx] = useState(null);
  const [parents, setParents] = useState({ father: null, mother: null });
  const [editing, setEditing] = useState(false);

  const fetchKoi = () => {
    setLoading(true);
    fetch(`${API_URL}/kois/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setKoi(data);
        setParents({ father: null, mother: null }); // Reset
        
        if (data.fatherId) {
          fetch(`${API_URL}/kois/${data.fatherId}`)
            .then(res => res.json())
            .then(f => setParents(prev => ({ ...prev, father: f })))
            .catch(() => {});
        }
        if (data.motherId) {
          fetch(`${API_URL}/kois/${data.motherId}`)
            .then(res => res.json())
            .then(m => setParents(prev => ({ ...prev, mother: m })))
            .catch(() => {});
        }

        if (data.status === 'transferring') {
          fetch(`${API_URL}/kois/${id}/transaction`)
            .then(res => res.json())
            .then(tx => setPendingTx(tx))
            .catch(console.error);
        } else {
          setPendingTx(null);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchKoi();
  }, [id]);

  const handleRespond = (action) => {
    if (!pendingTx || !currentUser) return;
    if (!window.confirm(`Bạn có chắc chắn muốn ${action === 'accept' ? 'nhận' : action === 'reject' ? 'từ chối' : 'hủy'} chuyển nhượng?`)) return;

    fetch(`${API_URL}/transactions/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: pendingTx.id,
        userId: currentUser.email,
        action
      })
    })
    .then(res => res.json())
    .then(() => {
      alert('Thành công!');
      window.location.reload();
    })
    .catch(err => alert('Lỗi: ' + err.message));
  };

  if (loading) return <div className="feed-loading">Đang tải thông tin...</div>;
  if (!koi) return <div className="feed-loading">Không tìm thấy hồ sơ cá.</div>;

  // Giả lập dữ liệu lịch sử từ thông tin hiện có (vì backend chưa có trường history)
  const historyEvents = koi.history || [
    { date: 'Hiện tại', title: 'Chủ sở hữu hiện tại', description: koi.owner, icon: 'person' },
    { date: koi.year ? `Năm ${koi.year}` : 'Không rõ', title: 'Được sinh ra', description: `Tại trại ${koi.breeder}`, icon: 'pets' }
  ];

  const isOwner = currentUser && koi.owner === currentUser.email;
  const isPendingBuyer = currentUser && pendingTx && pendingTx.buyerEmail === currentUser.email;
  const isVerified = koi.verified || koi.status === 'verified';
  const isAdmin = currentUser?.email === 'doantanvu2410@gmail.com';
  const canManage = isOwner || isAdmin;

  return (
    <>
      <div className="app-shell">
        <div className="koi-detail-page">
        <div className="koi-detail-card">
          {isVerified && (
            <div className="certificate-stamp">
              <span>WEME</span>
              <span>PET</span>
              <span>VERIFIED</span>
            </div>
          )}
          <div className="koi-detail-image">
            <img src={getImageUrl(koi.img)} alt={koi.name} />
          </div>
          <div className="koi-detail-info">
            <span className="koi-variety-tag">{koi.variety}</span>
            <h1>{koi.name}</h1>
            <div className="koi-identity-row">
              <span className="id-chip" title="Mã định danh duy nhất">
                <span className="material-icons-outlined koi-icon-sm">fingerprint</span>
                ID: {koi.id}
              </span>
              <span className={`verified-badge ${isVerified ? 'active' : 'muted'}`}>
                <span className="material-icons-outlined koi-icon-md">verified_user</span>
                {isVerified ? 'Đã xác minh chính chủ' : 'Chưa xác minh'}
              </span>
              {koi.status === 'transferring' && (
                <span className="status-pill pending ml-auto">
                  <span className="material-icons-outlined koi-icon-xs">sync_alt</span>
                  Đang chuyển nhượng
                </span>
              )}
            </div>
            <div className="koi-specs">
              <div className="spec-item">
                <span className="spec-label">Trại</span>
                <span className="spec-value">{koi.breeder}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Năm sinh</span>
                <span className="spec-value">{koi.year}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Kích thước</span>
                <span className="spec-value">{koi.size} cm</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Cân nặng</span>
                <span className="spec-value">{koi.kg ? `${koi.kg} kg` : '-'}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Giới tính</span>
                <span className="spec-value">{koi.gender === 'Male' ? 'Đực' : koi.gender === 'Female' ? 'Cái' : 'Chưa xác định'}</span>
              </div>
            </div>
            <div className="koi-description">
              <h3>Mô tả & Nguồn gốc</h3>
              <p>{koi.description || 'Chưa có mô tả chi tiết.'}</p>
            </div>
            <div className="detail-actions">
              {koi.certificate_img ? (
                <a 
                  href={getImageUrl(koi.certificate_img)} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-secondary btn-link"
                >
                  <span className="material-icons-outlined">description</span> Xem chứng nhận
                </a>
              ) : (
                <button className="btn-secondary" disabled>
                  <span className="material-icons-outlined">description</span> Chưa có chứng nhận
                </button>
              )}
              <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                Sao chép liên kết
              </button>
              
              {canManage && (
                <button className="btn-secondary" onClick={() => setEditing(true)}>
                  Chỉnh sửa
                </button>
              )}

              {canManage && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    if (!window.confirm('Xóa hồ sơ cá này?')) return;
                    fetch(`${API_URL}/kois/${koi.id}`, { method: 'DELETE' })
                      .then(res => {
                        if (!res.ok) throw new Error('Không thể xóa');
                        navigate('/profile');
                      })
                      .catch(() => alert('Lỗi khi xóa hồ sơ.'));
                  }}
                >
                  Xóa hồ sơ
                </button>
              )}

              {/* Logic nút chuyển nhượng */}
              {isOwner && koi.status === 'verified' && (
                <button className="btn-transfer btn-transfer-lg ml-auto" onClick={() => onTransfer(koi)}>
                  <span className="material-icons-outlined">move_up</span> Chuyển nhượng
                </button>
              )}

              {/* Logic cho người nhận (Buyer) */}
              {isPendingBuyer && (
                <div className="ml-auto inline-actions">
                  <button className="btn dark" onClick={() => handleRespond('accept')}>
                    Chấp nhận
                  </button>
                  <button className="btn danger" onClick={() => handleRespond('reject')}>
                    Từ chối
                  </button>
                </div>
              )}

              {/* Logic hủy cho chủ cũ (Seller) */}
              {isOwner && koi.status === 'transferring' && (
                <button className="btn secondary ml-auto" onClick={() => handleRespond('cancel')}>
                  Hủy yêu cầu
                </button>
              )}

            </div>
            
            {/* Lineage Section */}
            {(parents.father || parents.mother) && (
              <div className="lineage-section">
                <h3>Gia phả (Lineage)</h3>
                <div className="lineage-grid">
                  {parents.father && (
                    <div className="lineage-card">
                      <img src={getImageUrl(parents.father.img)} alt={parents.father.name} />
                      <div>
                        <div className="lineage-label">Cá Bố (Father)</div>
                        <div>
                            <a href={`/koi/${parents.father.id}`} className="lineage-link">{parents.father.name}</a>
                        </div>
                        <div className="lineage-meta">{parents.father.variety}</div>
                      </div>
                    </div>
                  )}
                  {parents.mother && (
                    <div className="lineage-card">
                      <img src={getImageUrl(parents.mother.img)} alt={parents.mother.name} />
                      <div>
                        <div className="lineage-label">Cá Mẹ (Mother)</div>
                        <div>
                             <a href={`/koi/${parents.mother.id}`} className="lineage-link">{parents.mother.name}</a>
                        </div>
                        <div className="lineage-meta">{parents.mother.variety}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="history-section">
              <h3>Lịch sử sở hữu</h3>
              <div className="timeline">
                {historyEvents.map((event, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-icon">
                      <span className="material-icons-outlined">{event.icon || 'history'}</span>
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-date">{event.date}</div>
                      <div className="timeline-title">{event.title}</div>
                      <div className="timeline-desc">{event.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="koi-owner-info">
              <span>Chủ sở hữu hiện tại: <strong>{koi.owner}</strong></span>
              <br/>
              <span className="koi-owner-note">Được bảo chứng bởi Weme Pet Platform</span>
            </div>
          </div>
        </div>
      </div>
      </div>
      {editing && koi && (
        <FullscreenModal onClose={() => setEditing(false)} hideCloseButton>
          <EditKoiPopup
            koi={koi}
            onUpdate={() => {
              setEditing(false);
              fetchKoi();
            }}
            onClose={() => setEditing(false)}
          />
        </FullscreenModal>
      )}
    </>
  );
};

export default KoiDetailPage;
