import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRelativeTime, API_URL } from '../utils';

const NotificationsPage = ({ currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (currentUser) {
      fetch(`${API_URL}/notifications?userId=${currentUser.email}`)
        .then(res => res.json())
        .then(data => {
          setNotifications(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="empty-state">
        <span className="material-symbols-outlined empty-state-icon">lock</span>
        <p className="empty-state-text">Vui lòng đăng nhập để xem thông báo.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-shell">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '12px', marginBottom: '8px' }} />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="page-shell">
        <div className="empty-state">
          <span className="material-symbols-outlined empty-state-icon">notifications_off</span>
          <p className="empty-state-text">Bạn chưa có thông báo nào mới.</p>
        </div>
      </div>
    );
  }

  const getIconInfo = (type) => {
    switch (type) {
      case 'like': return { icon: 'favorite', color: '#ef4444', bg: '#fee2e2' };
      case 'comment': return { icon: 'chat_bubble', color: '#3b82f6', bg: '#dbeafe' };
      case 'transfer_request': return { icon: 'swap_horiz', color: '#f59e0b', bg: '#fef3c7' };
      case 'follow': return { icon: 'person_add', color: '#8b5cf6', bg: '#ede9fe' };
      default: return { icon: 'notifications', color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    if (filter === 'comments') return notif.type === 'comment';
    if (filter === 'likes') return notif.type === 'like';
    return true;
  });

  // Group notifications
  const groupedNotifications = filteredNotifications.reduce((acc, notif) => {
    const date = new Date(notif.createdAt);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();
    
    const key = isToday ? 'Hôm nay' : 'Trước đó';
    if (!acc[key]) acc[key] = [];
    acc[key].push(notif);
    return acc;
  }, {});

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1>Thông báo</h1>
          <p>Theo dõi lượt thích, bình luận và chuyển nhượng.</p>
        </div>
        <div className="segmented">
          <button
            className={`segmented-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tất cả
          </button>
          <button
            className={`segmented-btn ${filter === 'comments' ? 'active' : ''}`}
            onClick={() => setFilter('comments')}
          >
            Bình luận
          </button>
          <button
            className={`segmented-btn ${filter === 'likes' ? 'active' : ''}`}
            onClick={() => setFilter('likes')}
          >
            Thích
          </button>
        </div>
      </div>
      
      {filteredNotifications.length === 0 ? (
        <div className="empty-state">
          <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: '32px' }}>filter_list_off</span>
          <p className="empty-state-text" style={{ fontSize: '0.9rem' }}>Không có thông báo nào cho bộ lọc này.</p>
        </div>
      ) : (
        Object.entries(groupedNotifications).map(([group, items]) => (
        <div key={group} className="notification-group">
          <div className="notification-group-title">{group}</div>
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border-soft)', overflow: 'hidden' }}>
            {items.map((notif) => {
              const { icon, color } = getIconInfo(notif.type);
              const actorName = notif.actorId?.split('@')[0] || 'Người dùng';
              const isKoiItem = notif.koiId && notif.koiId.startsWith('KOI-');
              const targetLink = notif.koiId
                ? (notif.type === 'transfer_request' || isKoiItem ? `/koi/${notif.koiId}` : `/post/${notif.koiId}`)
                : (notif.type === 'follow' ? `/profile/${notif.actorId}` : '#');
              
              return (
                <Link 
                  to={targetLink} 
                  key={notif.id} 
                  className="notification-card"
                >
                  <div className="notification-avatar-wrapper">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${notif.actorId}&background=random&color=fff`} 
                      alt={actorName} 
                      className="notification-avatar" 
                    />
                    <div className="notification-badge" style={{ background: color }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'white' }}>{icon}</span>
                    </div>
                  </div>
                  
                  <div className="notification-content">
                    <span>
                      <strong>{actorName}</strong> {notif.type === 'like' ? 'đã thích bài viết của bạn.' : 
                        notif.type === 'comment' ? `đã bình luận: "${notif.text}"` : 
                        notif.type === 'follow' ? 'đã bắt đầu theo dõi bạn.' :
                        notif.text}
                    </span>
                    <div className="notification-time">
                      {getRelativeTime(notif.createdAt)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))
      )}
    </div>
  );
};

export default NotificationsPage;
