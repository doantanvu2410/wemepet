import React, { useState, useEffect } from 'react';
import { API_URL } from '../utils';

const AdminPage = () => {
  const [kois, setKois] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchValue, setSearchValue] = useState('');

  const fetchKois = () => {
    fetch(`${API_URL}/kois`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const identityKois = data.filter(k => k.type === 'koi_identity' || (k.id && k.id.startsWith('KOI-')));
          setKois(identityKois.reverse());
        }
      })
      .catch(err => console.error(err));
  };

  const fetchSummary = () => {
    fetch(`${API_URL}/admin/summary`)
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchKois();
    fetchSummary();
  }, []);

  const filteredKois = kois.filter((koi) => {
    if (statusFilter !== 'all' && koi.status !== statusFilter) {
      return false;
    }
    if (!searchValue) return true;
    return (koi.name && koi.name.toLowerCase().includes(searchValue.toLowerCase())) || (koi.id && koi.id.toLowerCase().includes(searchValue.toLowerCase()));
  });

  const rectangles = [
    { label: 'Tổng hồ sơ', value: summary?.kois?.total ?? filteredKois.length },
    { label: 'Đang chờ', value: summary?.kois?.pending ?? filteredKois.filter(k => k.status === 'pending').length },
    { label: 'Đã xác minh', value: summary?.kois?.verified ?? filteredKois.filter(k => k.status === 'verified').length },
    { label: 'Đã từ chối', value: summary?.kois?.rejected ?? filteredKois.filter(k => k.status === 'rejected').length },
    { label: 'Bài viết', value: summary?.posts?.total ?? 0 },
    { label: 'Người dùng', value: summary?.users?.total ?? 0 },
    { label: 'Giao dịch', value: summary?.transactions?.total ?? 0 },
  ];

  const handleApprove = (id) => {
    if (!window.confirm('Xác nhận duyệt hồ sơ này?')) return;
    fetch(`${API_URL}/kois/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'verified', verified: true })
    })
      .then(res => res.json())
      .then(() => {
        fetchKois();
        fetchSummary();
      })
      .catch(err => alert('Lỗi: ' + err.message));
  };

  const handleReject = (id) => {
    if (!window.confirm('Xác nhận từ chối hồ sơ này?')) return;
    fetch(`${API_URL}/kois/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', verified: false })
    })
      .then(res => res.json())
      .then(() => {
        fetchKois();
        fetchSummary();
      })
      .catch(err => alert('Lỗi: ' + err.message));
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1>Dashboard quản lý</h1>
          <p>Theo dõi hồ sơ định danh, trạng thái phê duyệt và hệ thống.</p>
        </div>
      </div>

      <div className="admin-stats-grid">
        {rectangles.map((item) => (
          <div key={item.label} className="stat-card">
            <span className="stat-label">{item.label}</span>
            <strong className="stat-value">{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="page-toolbar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Đang chờ duyệt</option>
          <option value="verified">Đã xác minh</option>
          <option value="rejected">Đã từ chối</option>
        </select>
        <div className="input-with-icon">
          <span className="material-symbols-outlined">search</span>
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Tìm theo mã hoặc tên"
          />
        </div>
      </div>

      <div className="admin-table">
        <div className="admin-table-head">
          <div>ID</div>
          <div>Tên</div>
          <div>Trạng thái</div>
          <div>Chủ sở hữu</div>
          <div>Ngày cập nhật</div>
          <div>Hành động</div>
        </div>
        {filteredKois.length === 0 ? (
          <div className="admin-table-empty">Không có dữ liệu.</div>
        ) : (
          filteredKois.map((koi) => (
            <div key={koi.id} className="admin-table-row">
              <div>{koi.id}</div>
              <div>{koi.name}</div>
              <div>
                <span className={`status-pill ${koi.status}`}>
                  {koi.status === 'verified' ? 'Đã duyệt' :
                   koi.status === 'rejected' ? 'Từ chối' :
                   koi.status === 'pending' ? 'Chờ duyệt' : koi.status}
                </span>
              </div>
              <div>{koi.owner || 'Chưa gắn'}</div>
              <div>{new Date(koi.updatedAt || koi.createdAt).toLocaleDateString()}</div>
              <div className="admin-row-actions">
                {koi.status === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(koi.id)} className="btn primary small">Duyệt</button>
                    <button onClick={() => handleReject(koi.id)} className="btn secondary small">Từ chối</button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPage;
