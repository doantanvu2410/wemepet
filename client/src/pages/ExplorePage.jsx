import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, getImageUrl, getRelativeTime } from '../utils';
import { useToast } from '../components/Toast';

const ADMIN_EMAIL = 'doantanvu2410@gmail.com';

const ExplorePage = ({ currentUser, onRegisterKoi }) => {
  const [kois, setKois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('verified');
  const [varietyFilter, setVarietyFilter] = useState('all');
  const toast = useToast();

  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    setStatusFilter(isAdmin ? 'all' : 'verified');
  }, [isAdmin]);

  useEffect(() => {
    const fetchKois = async () => {
      try {
        const res = await fetch(`${API_URL}/kois`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Dữ liệu không hợp lệ');
        setKois(data);
      } catch (err) {
        console.error(err);
        toast('Không thể tải danh sách hồ sơ.', 'error');
        setKois([]);
      } finally {
        setLoading(false);
      }
    };

    fetchKois();
  }, []);

  const varieties = useMemo(() => {
    const values = new Set();
    kois.forEach((k) => {
      if (k.variety) values.add(k.variety);
    });
    return Array.from(values).sort();
  }, [kois]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return kois.filter((koi) => {
      const isOwner = currentUser?.email && koi.owner === currentUser.email;
      const canView = isAdmin || koi.status === 'verified' || isOwner;
      if (!canView) return false;

      if (statusFilter === 'verified' && koi.status !== 'verified') return false;
      if (statusFilter === 'pending' && koi.status !== 'pending') return false;
      if (statusFilter === 'rejected' && koi.status !== 'rejected') return false;
      if (statusFilter === 'mine' && !isOwner) return false;

      if (varietyFilter !== 'all' && koi.variety !== varietyFilter) return false;

      if (!normalized) return true;
      const haystack = `${koi.name || ''} ${koi.id || ''} ${koi.variety || ''} ${koi.breeder || ''}`.toLowerCase();
      return haystack.includes(normalized);
    }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [kois, query, statusFilter, varietyFilter, currentUser?.email, isAdmin]);

  if (loading) {
    return <div className="feed-loading">Đang tải danh mục...</div>;
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1>Khám phá định danh</h1>
          <p>Tra cứu hồ sơ cá Koi đã xác minh, theo dõi trạng thái và lịch sử.</p>
        </div>
        {currentUser && (
          <button className="btn primary" onClick={onRegisterKoi}>
            Đăng ký định danh
          </button>
        )}
      </div>

      <div className="page-toolbar">
        <div className="input-with-icon">
          <span className="material-symbols-outlined">search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, ID, trại, dòng..."
          />
        </div>
        <select value={varietyFilter} onChange={(e) => setVarietyFilter(e.target.value)}>
          <option value="all">Tất cả dòng</option>
          {varieties.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {isAdmin && <option value="all">Tất cả trạng thái</option>}
          <option value="verified">Đã xác minh</option>
          <option value="pending">Chờ duyệt</option>
          <option value="rejected">Từ chối</option>
          {currentUser && <option value="mine">Của tôi</option>}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="material-symbols-outlined empty-state-icon">search_off</span>
          <p className="empty-state-text">Không tìm thấy hồ sơ phù hợp.</p>
        </div>
      ) : (
        <div className="explore-grid">
          {filtered.map((koi) => (
            <Link to={`/koi/${koi.id}`} className="explore-card" key={koi.id}>
              <div className="explore-card-media">
                <img src={getImageUrl(koi.img)} alt={koi.name || koi.id} />
                {koi.status !== 'verified' && (
                  <span className={`status-pill ${koi.status}`}>{koi.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}</span>
                )}
              </div>
              <div className="explore-card-body">
                <div className="explore-card-title">{koi.name || koi.id}</div>
                <div className="explore-card-meta">
                  {koi.variety || 'Koi'} • {koi.breeder || 'Chưa rõ trại'}
                </div>
                <div className="explore-card-meta subtle">
                  {koi.size ? `${koi.size} cm` : 'Chưa rõ'} · {koi.year || 'N/A'} · {getRelativeTime(koi.createdAt)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
