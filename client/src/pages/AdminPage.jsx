import React, { useState, useEffect } from 'react';
import { API_URL } from '../utils';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('kois');
  const [kois, setKois] = useState([]);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [txStatusFilter, setTxStatusFilter] = useState('all');
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

  const fetchPosts = () => {
    fetch(`${API_URL}/posts`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPosts(data.slice().reverse());
        }
      })
      .catch(err => console.error(err));
  };

  const fetchUsers = () => {
    fetch(`${API_URL}/users`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data.slice().reverse());
        }
      })
      .catch(err => console.error(err));
  };

  const fetchTransactions = () => {
    fetch(`${API_URL}/transactions`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTransactions(data);
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
    fetchPosts();
    fetchUsers();
    fetchTransactions();
    fetchSummary();
  }, []);

  const filteredKois = kois.filter((koi) => {
    if (statusFilter !== 'all' && koi.status !== statusFilter) {
      return false;
    }
    if (!searchValue) return true;
    return (koi.name && koi.name.toLowerCase().includes(searchValue.toLowerCase())) || (koi.id && koi.id.toLowerCase().includes(searchValue.toLowerCase()));
  });

  const filteredPosts = posts.filter((post) => {
    if (!searchValue) return true;
    const haystack = `${post.id || ''} ${post.owner || ''} ${post.description || ''}`.toLowerCase();
    return haystack.includes(searchValue.toLowerCase());
  });

  const filteredUsers = users.filter((user) => {
    if (!searchValue) return true;
    const haystack = `${user.email || ''} ${user.displayName || ''}`.toLowerCase();
    return haystack.includes(searchValue.toLowerCase());
  });

  const filteredTransactions = transactions.filter((tx) => {
    if (txStatusFilter !== 'all' && tx.status !== txStatusFilter) return false;
    if (!searchValue) return true;
    const haystack = `${tx.id || ''} ${tx.koiId || ''} ${tx.sellerId || ''} ${tx.buyerEmail || ''}`.toLowerCase();
    return haystack.includes(searchValue.toLowerCase());
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

  const handleDeletePost = (id) => {
    if (!window.confirm('Xóa bài viết này?')) return;
    fetch(`${API_URL}/posts/${id}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Không thể xóa');
        setPosts(prev => prev.filter(p => p.id !== id));
        fetchSummary();
      })
      .catch(err => alert('Lỗi: ' + err.message));
  };

  const handleToggleRole = (user) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Chuyển quyền ${user.email} thành ${nextRole}?`)) return;
    fetch(`${API_URL}/users/${user.email}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: nextRole })
    })
      .then(res => res.json())
      .then(() => {
        setUsers(prev => prev.map(u => (u.email === user.email ? { ...u, role: nextRole } : u)));
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
        <div className="segmented">
          <button className={`segmented-btn ${activeTab === 'kois' ? 'active' : ''}`} onClick={() => setActiveTab('kois')}>Hồ sơ</button>
          <button className={`segmented-btn ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>Bài viết</button>
          <button className={`segmented-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Người dùng</button>
          <button className={`segmented-btn ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>Giao dịch</button>
        </div>

        {activeTab === 'kois' && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Đang chờ duyệt</option>
            <option value="verified">Đã xác minh</option>
            <option value="rejected">Đã từ chối</option>
          </select>
        )}
        {activeTab === 'transactions' && (
          <select value={txStatusFilter} onChange={(e) => setTxStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="pending_acceptance">Đang chờ</option>
            <option value="completed">Hoàn tất</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        )}

        <div className="input-with-icon">
          <span className="material-symbols-outlined">search</span>
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Tìm theo mã hoặc tên"
          />
        </div>
      </div>

      {activeTab === 'kois' && (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th>Trạng thái</th>
              <th>Chủ sở hữu</th>
              <th>Ngày cập nhật</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredKois.length === 0 ? (
              <tr><td colSpan="6" className="data-empty">Không có dữ liệu.</td></tr>
            ) : (
              filteredKois.map((koi) => (
                <tr key={koi.id}>
                  <td>{koi.id}</td>
                  <td>{koi.name}</td>
                  <td>
                    <span className={`status-pill ${koi.status}`}>
                      {koi.status === 'verified' ? 'Đã duyệt' :
                       koi.status === 'rejected' ? 'Từ chối' :
                       koi.status === 'pending' ? 'Chờ duyệt' : koi.status}
                    </span>
                  </td>
                  <td>{koi.owner || 'Chưa gắn'}</td>
                  <td>{new Date(koi.updatedAt || koi.createdAt).toLocaleDateString()}</td>
                  <td className="data-table-actions">
                    {koi.status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(koi.id)} className="btn primary small">Duyệt</button>
                        <button onClick={() => handleReject(koi.id)} className="btn secondary small">Từ chối</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {activeTab === 'posts' && (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Chủ sở hữu</th>
              <th>Nội dung</th>
              <th>Ngày</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredPosts.length === 0 ? (
              <tr><td colSpan="5" className="data-empty">Không có dữ liệu.</td></tr>
            ) : (
              filteredPosts.map((post) => (
                <tr key={post.id}>
                  <td>{post.id}</td>
                  <td>{post.owner}</td>
                  <td>{post.description?.slice(0, 80) || '—'}</td>
                  <td>{new Date(post.createdAt).toLocaleDateString()}</td>
                  <td className="data-table-actions">
                    <button onClick={() => handleDeletePost(post.id)} className="btn secondary small">Xóa</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {activeTab === 'users' && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Tên</th>
              <th>Role</th>
              <th>Theo dõi</th>
              <th>Đang theo dõi</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr><td colSpan="6" className="data-empty">Không có dữ liệu.</td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.email}>
                  <td>{user.email}</td>
                  <td>{user.displayName || '—'}</td>
                  <td>{user.role || 'user'}</td>
                  <td>{user.followers?.length || 0}</td>
                  <td>{user.following?.length || 0}</td>
                  <td className="data-table-actions">
                    <button className="btn secondary small" onClick={() => handleToggleRole(user)}>
                      Chuyển role
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {activeTab === 'transactions' && (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cá</th>
              <th>Bên bán</th>
              <th>Bên mua</th>
              <th>Trạng thái</th>
              <th>Ngày</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr><td colSpan="6" className="data-empty">Không có dữ liệu.</td></tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.id}</td>
                  <td>{tx.koi?.name || tx.koiId}</td>
                  <td>{tx.sellerId}</td>
                  <td>{tx.buyerEmail}</td>
                  <td>{tx.status}</td>
                  <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminPage;
