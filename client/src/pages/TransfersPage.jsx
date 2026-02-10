import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, getImageUrl, getRelativeTime } from '../utils';
import { useToast } from '../components/Toast';

const TransfersPage = ({ currentUser }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadTransactions = async () => {
    if (!currentUser?.email) return;
    try {
      const res = await fetch(`${API_URL}/transactions?userId=${encodeURIComponent(currentUser.email)}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Dữ liệu không hợp lệ');
      setTransactions(data);
    } catch (err) {
      console.error(err);
      toast('Không thể tải giao dịch.', 'error');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [currentUser?.email]);

  const incoming = useMemo(
    () => transactions.filter(t => t.status === 'pending_acceptance' && t.buyerEmail === currentUser?.email),
    [transactions, currentUser?.email]
  );
  const outgoing = useMemo(
    () => transactions.filter(t => t.status === 'pending_acceptance' && t.sellerId === currentUser?.email),
    [transactions, currentUser?.email]
  );
  const history = useMemo(
    () => transactions.filter(t => t.status !== 'pending_acceptance'),
    [transactions]
  );

  const handleRespond = async (tx, action) => {
    if (!currentUser?.email) return;
    const confirmText = action === 'accept'
      ? 'Xác nhận nhận chuyển nhượng?'
      : action === 'reject'
        ? 'Bạn muốn từ chối giao dịch này?'
        : 'Bạn muốn hủy giao dịch này?';
    if (!window.confirm(confirmText)) return;

    try {
      const res = await fetch(`${API_URL}/transactions/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: tx.id,
          userId: currentUser.email,
          action
        })
      });
      if (!res.ok) throw new Error(await res.text());
      toast('Cập nhật giao dịch thành công.', 'success');
      loadTransactions();
    } catch (err) {
      console.error(err);
      toast(`Lỗi: ${err.message}`, 'error');
    }
  };

  if (!currentUser) {
    return (
      <div className="empty-state">
        <span className="material-symbols-outlined empty-state-icon">lock</span>
        <p className="empty-state-text">Vui lòng đăng nhập để quản lý chuyển nhượng.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="feed-loading">Đang tải giao dịch...</div>;
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1>Chuyển nhượng số</h1>
          <p>Quản lý yêu cầu chuyển nhượng và lịch sử sở hữu.</p>
        </div>
      </div>

      <section className="transfer-section">
        <div className="section-title">Chờ bạn xác nhận</div>
        {incoming.length === 0 ? (
          <div className="empty-subtle">Không có yêu cầu mới.</div>
        ) : (
          incoming.map((tx) => (
            <div className="transfer-card" key={tx.id}>
              <div className="transfer-media">
                <img src={getImageUrl(tx.koi?.img)} alt={tx.koi?.name || tx.koiId} />
              </div>
              <div className="transfer-body">
                <div className="transfer-title">
                  <Link to={`/koi/${tx.koiId}`}>{tx.koi?.name || tx.koiId}</Link>
                  <span className="status-pill pending">Đang chờ</span>
                </div>
                <div className="transfer-meta">Từ: {tx.sellerId}</div>
                <div className="transfer-meta">Nhận: {tx.buyerEmail}</div>
                <div className="transfer-meta subtle">{getRelativeTime(tx.createdAt)}</div>
              </div>
              <div className="transfer-actions">
                <button className="btn primary small" onClick={() => handleRespond(tx, 'accept')}>Chấp nhận</button>
                <button className="btn secondary small" onClick={() => handleRespond(tx, 'reject')}>Từ chối</button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="transfer-section">
        <div className="section-title">Bạn đang gửi</div>
        {outgoing.length === 0 ? (
          <div className="empty-subtle">Chưa có giao dịch nào đang chờ.</div>
        ) : (
          outgoing.map((tx) => (
            <div className="transfer-card" key={tx.id}>
              <div className="transfer-media">
                <img src={getImageUrl(tx.koi?.img)} alt={tx.koi?.name || tx.koiId} />
              </div>
              <div className="transfer-body">
                <div className="transfer-title">
                  <Link to={`/koi/${tx.koiId}`}>{tx.koi?.name || tx.koiId}</Link>
                  <span className="status-pill pending">Đang chờ</span>
                </div>
                <div className="transfer-meta">Người nhận: {tx.buyerEmail}</div>
                <div className="transfer-meta subtle">{getRelativeTime(tx.createdAt)}</div>
              </div>
              <div className="transfer-actions">
                <button className="btn ghost small" onClick={() => handleRespond(tx, 'cancel')}>Hủy yêu cầu</button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="transfer-section">
        <div className="section-title">Lịch sử</div>
        {history.length === 0 ? (
          <div className="empty-subtle">Chưa có lịch sử giao dịch.</div>
        ) : (
          history.map((tx) => (
            <div className="transfer-card" key={tx.id}>
              <div className="transfer-media">
                <img src={getImageUrl(tx.koi?.img)} alt={tx.koi?.name || tx.koiId} />
              </div>
              <div className="transfer-body">
                <div className="transfer-title">
                  <Link to={`/koi/${tx.koiId}`}>{tx.koi?.name || tx.koiId}</Link>
                  <span className={`status-pill ${tx.status === 'completed' ? 'success' : 'muted'}`}>
                    {tx.status === 'completed' ? 'Hoàn tất' : 'Đã hủy'}
                  </span>
                </div>
                <div className="transfer-meta">Bên bán: {tx.sellerId}</div>
                <div className="transfer-meta">Bên mua: {tx.buyerEmail}</div>
                <div className="transfer-meta subtle">{getRelativeTime(tx.completedAt || tx.createdAt)}</div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default TransfersPage;
