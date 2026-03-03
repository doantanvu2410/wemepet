import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getImageUrl, getRelativeTime, API_URL, getAvatarUrl } from '../utils';
import { useToast } from './Toast';
import { FullscreenModal } from './Popups';
import EditPostPopup from './EditPostPopup';

const FeedCard = ({ koi, currentUser, onRemove, onUpdate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [likes, setLikes] = useState(koi.likes || []);
  const [bookmarks, setBookmarks] = useState(koi.bookmarks || []);
  const [showHeart, setShowHeart] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const toast = useToast();
  const menuRef = useRef(null);
  
  const isLiked = currentUser && likes.includes(currentUser.email);
  const isBookmarked = currentUser && bookmarks.includes(currentUser.email);
  const isKoiIdentity = koi.type === 'koi_identity' || (koi.id && koi.id.startsWith('KOI-'));
  const hasMedia = (koi.images && koi.images.length > 0) || koi.img;
  const isOwner = currentUser?.email && koi.owner === currentUser.email;
  const canManage = isOwner || currentUser?.email === 'doantanvu2410@gmail.com';
  const openPostDetail = () =>
    navigate(`/post/${koi.id}`, { state: { backgroundLocation: location } });

  const description = koi.description || (isKoiIdentity ? `Cá Koi ${koi.variety} tuyệt đẹp, kích thước ${koi.size}cm.` : 'Chưa có mô tả.');
  const ownerName = koi.ownerProfile?.displayName || koi.owner?.split('@')[0] || 'user';
  const ownerAvatar = koi.ownerProfile?.photoURL
    ? getImageUrl(koi.ownerProfile.photoURL)
    : (currentUser?.email === koi.owner && currentUser.photoURL
        ? currentUser.photoURL
        : getAvatarUrl(koi.owner));
  const MAX_LENGTH = 100;
  const isLongCaption = description.length > MAX_LENGTH;

  const handleBookmark = () => {
    if (!currentUser) {
      alert("Vui lòng đăng nhập để lưu bài viết!");
      return;
    }
    
    const newBookmarks = isBookmarked
      ? bookmarks.filter(email => email !== currentUser.email)
      : [...bookmarks, currentUser.email];
    setBookmarks(newBookmarks);

    fetch(`${API_URL}/items/${koi.id}/bookmark`, { // Đổi sang /items
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.email })
    })
    .then(res => res.json())
    .then(data => {
      setBookmarks(data.bookmarks);
    })
    .catch(err => console.error(err));
  };

  const handleLike = () => {
    if (!currentUser) {
      alert("Vui lòng đăng nhập để thả tim!");
      return;
    }
    
    const newLikes = isLiked 
      ? likes.filter(email => email !== currentUser.email)
      : [...likes, currentUser.email];
    setLikes(newLikes);

    fetch(`${API_URL}/items/${koi.id}/like`, { // Đổi sang /items
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.email })
    })
    .then(res => res.json())
    .then(data => {
      setLikes(data.likes);
    })
    .catch(err => console.error(err));
  };

  const handleDoubleTap = (e) => {
    e.stopPropagation();
    if (!isLiked) {
      handleLike();
    }
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/post/${koi.id}`;
    navigator.clipboard.writeText(url);
    toast('Đã sao chép liên kết!', 'success');
  };

  const handleDelete = async () => {
    if (!canManage) return;
    if (!window.confirm('Xóa bài viết này?')) return;
    try {
      const endpoint = isKoiIdentity ? `${API_URL}/kois/${koi.id}` : `${API_URL}/posts/${koi.id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      toast('Đã xóa bài viết.', 'success');
      onRemove?.(koi.id);
      setShowMenu(false);
    } catch (err) {
      console.error(err);
      toast(`Lỗi: ${err.message}`, 'error');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  return (
    <article className="feed-card">
      <header className="feed-card-header">
        <Link to={`/profile/${koi.owner}`} className="feed-card-author">
          <div className="feed-avatar">
            <img 
              src={ownerAvatar} 
              alt={koi.owner} 
            />
          </div>
          <div className="feed-card-author-meta">
            <span className="feed-user-name">{ownerName}</span>
            {(koi.breeder || koi.feeling) && <span className="feed-nav-dot">•</span>}
            {koi.feeling && <span className="feed-user-feeling">{koi.feeling}</span>}
            {!koi.feeling && koi.breeder && <span className="feed-card-author-subtitle">{koi.breeder}</span>}
          </div>
        </Link>
        <div className="feed-card-menu-wrapper" ref={menuRef}>
          <button
            className="feed-card-more"
            type="button"
            aria-label="More actions"
            onClick={() => setShowMenu((prev) => !prev)}
          >
          <span className="material-symbols-outlined">more_horiz</span>
          </button>
          {showMenu && (
            <div className="feed-card-menu">
              {!isKoiIdentity && canManage && (
                <button
                  type="button"
                  className="feed-card-menu-item"
                  onClick={() => {
                    setShowMenu(false);
                    setShowEdit(true);
                  }}
                >
                  Chỉnh sửa
                </button>
              )}
              <button type="button" className="feed-card-menu-item" onClick={handleShare}>
                Sao chép liên kết
              </button>
              {canManage && (
                <button type="button" className="feed-card-menu-item danger" onClick={handleDelete}>
                  Xóa bài viết
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {hasMedia ? (
          <div className="feed-card-media">
          {showHeart && (
            <div className="heart-overlay">
              <span className="material-symbols-outlined">favorite</span>
            </div>
          )}

          {koi.images && koi.images.length > 1 ? (
            <div className="feed-carousel">
              {koi.images.map((img, idx) => (
                <div
                  key={idx}
                  className="feed-carousel-item"
                  onClick={openPostDetail}
                >
                  {img.match(/\.(mp4|webm|ogg|mov|qt|avi|wmv|flv|m4v)$/i) ? (
                    <>
                      <video src={getImageUrl(img)} onDoubleClick={handleDoubleTap} className="feed-media-video" />
                      <div className="feed-media-play">
                        <span className="material-symbols-outlined">play_arrow</span>
                      </div>
                    </>
                  ) : (
                    <img src={getImageUrl(img)} alt={`${koi.name}-${idx}`} loading="lazy" onDoubleClick={handleDoubleTap} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <img 
              src={getImageUrl(koi.images?.[0] || koi.img)} 
              alt={koi.name} 
              loading="lazy"
              onDoubleClick={handleDoubleTap} 
              onClick={openPostDetail}
            />
          )}
        </div>
      ) : (
          <div 
            className="feed-card-text-only" 
            onDoubleClick={handleDoubleTap}
          >
            {showHeart && (
              <div className="heart-overlay">
                <span className="material-symbols-outlined">favorite</span>
              </div>
            )}
            <p className="feed-card-text">
              {koi.description}
            </p>
          </div>
      )}

      <div className="feed-card-actions">
        <div className="feed-card-actions-left">
          <button onClick={handleLike} className={`icon-button ${isLiked ? 'active' : ''}`} type="button">
            <span className="material-icons-outlined">{isLiked ? 'favorite' : 'favorite_border'}</span>
            <span className="action-count">{likes.length || 0}</span>
          </button>
          <button className="icon-button" type="button" onClick={openPostDetail}>
            <span className="material-icons-outlined">mode_comment</span>
            <span className="action-count">{koi.comments?.length || 0}</span>
          </button>
          <button className="icon-button" type="button" onClick={handleShare}>
            <span className="material-icons-outlined">send</span>
          </button>
        </div>
        <div className="feed-card-actions-right">
          <button onClick={handleBookmark} className={`icon-button ${isBookmarked ? 'bookmarked' : ''}`} type="button">
            <span className="material-icons-outlined">{isBookmarked ? 'bookmark' : 'bookmark_border'}</span>
          </button>
        </div>
      </div>

      <div className={`feed-card-caption ${hasMedia ? '' : 'no-media'}`}>
        {hasMedia && (
          <div className="caption-text">
            <strong>{ownerName}</strong>
            <span>
              {isLongCaption && !isExpanded ? `${description.slice(0, MAX_LENGTH)}...` : description}
            </span>
            {isLongCaption && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="caption-toggle"
              >
                {isExpanded ? 'ẩn bớt' : 'xem thêm'}
              </button>
            )}
          </div>
        )}
          {koi.taggedUsers && (
            <span className="tagged">
              — cùng với {koi.taggedUsers.split(',').map(u => `@${u.trim()}`).join(' ')}
            </span>
          )}
          <div className="caption-meta">
            <span className="feed-card-timestamp">{getRelativeTime(koi.createdAt || new Date().toISOString())}</span>
          </div>
      </div>

      {showEdit && (
        <FullscreenModal onClose={() => setShowEdit(false)} hideCloseButton>
          <EditPostPopup
            post={koi}
            onClose={() => setShowEdit(false)}
            onSaved={(updated) => onUpdate?.(updated)}
          />
        </FullscreenModal>
      )}
    </article>
  );
};

export default FeedCard;
