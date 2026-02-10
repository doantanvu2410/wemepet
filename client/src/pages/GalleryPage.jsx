import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FeedCard from '../components/FeedCard';
import { getImageUrl, API_URL, compressImage } from '../utils'; // Import cấu hình API
import { useToast } from '../components/Toast';

const feelingsList = [
  { icon: '😄', label: 'Hạnh phúc' },
  { icon: '🥰', label: 'Được yêu' },
  { icon: '🤩', label: 'Hào hứng' },
  { icon: '😎', label: 'Tuyệt vời' },
  { icon: '😴', label: 'Mệt mỏi' },
  { icon: '😔', label: 'Buồn' },
  { icon: '😡', label: 'Tức giận' },
  { icon: '🤔', label: 'Đang suy nghĩ' },
];

const GalleryPage = ({ refreshKey, currentUser }) => {
  const [kois, setKois] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State cho Create Post Widget
  const [isExpanded, setIsExpanded] = useState(false);
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFeelings, setShowFeelings] = useState(false);
  const [feeling, setFeeling] = useState(null);
  const [pendingIdentities, setPendingIdentities] = useState([]);
  const toast = useToast();
  const previewCarouselRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadFeed = async () => {
      try {
        const res = await fetch(`${API_URL}/feed?_t=${Date.now()}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Dữ liệu API không hợp lệ');

        const sortedFeed = [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const publicFeed = sortedFeed.filter(k => k.status !== 'pending');
        setPendingIdentities(sortedFeed.filter(k => k.status === 'pending' && k.type === 'koi_identity').slice(0, 5));

        const ownerEmails = Array.from(new Set(publicFeed.map(item => item.owner).filter(Boolean)));
        if (ownerEmails.length > 0) {
          try {
            const batchRes = await fetch(`${API_URL}/users/batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ emails: ownerEmails })
            });
            const users = await batchRes.json();
            const userMap = new Map(users.map(user => [user.email, user]));
            setKois(publicFeed.map(item => ({
              ...item,
              ownerProfile: userMap.get(item.owner) || null
            })));
          } catch (err) {
            console.error(err);
            setKois(publicFeed);
          }
        } else {
          setKois(publicFeed);
        }
      } catch (err) {
        console.error(err);
        setKois([]);
        setPendingIdentities([]);
      } finally {
        setLoading(false);
      }
    };

    loadFeed();
  }, [refreshKey]);

  useEffect(() => {
    return () => {
      previewUrls.forEach(u => URL.revokeObjectURL(u.url));
    };
  }, [previewUrls]);

  const filters = [
    { name: 'Normal', class: 'none', style: {} },
    { name: 'Clarendon', class: 'clarendon', style: { filter: 'contrast(1.2) saturation(1.35)' } },
    { name: 'Gingham', class: 'gingham', style: { filter: 'sepia(.04) contrast(1.05)' } },
    { name: 'Moon', class: 'moon', style: { filter: 'grayscale(1) contrast(1.1) brightness(1.1)' } },
    { name: 'Lark', class: 'lark', style: { filter: 'contrast(.9)' } },
    { name: 'Reyes', class: 'reyes', style: { filter: 'sepia(.22) brightness(1.1) contrast(.85) saturate(.75)' } },
  ];

  const handleFileChange = async (event) => {
    if (event.target.files && event.target.files.length > 0) {
      // Xóa các URL xem trước cũ để tránh rò rỉ bộ nhớ
      previewUrls.forEach(u => URL.revokeObjectURL(u.url));

      const selectedFiles = Array.from(event.target.files).slice(0, 6); // Giới hạn 6 files
      
      // Nén các file ảnh
      const processedFiles = await Promise.all(selectedFiles.map(async (file) => {
        if (file.type.startsWith('image/')) {
          try {
            return await compressImage(file);
          } catch (e) { return file; }
        }
        return file;
      }));

      const urls = await Promise.all(processedFiles.map(async (file) => {
        const url = URL.createObjectURL(file);
        if (file.type.startsWith('video/')) {
          try {
            const duration = await new Promise((resolve) => {
              const video = document.createElement('video');
              video.onloadedmetadata = () => resolve(video.duration);
              video.src = url;
            });
            return { url, type: file.type, duration };
          } catch (e) { return file; }
        }
        return file;
      }));

      // Thay thế danh sách file cũ bằng danh sách mới
      setFiles(processedFiles);
      setPreviewUrls(urls.map(f => ({ url: f.url || URL.createObjectURL(f), type: f.type, duration: f.duration })));
      setIsExpanded(true);
    }
  };

  const removeFile = (index) => {
    const newFiles = [...files];
    const newPreviewUrls = [...previewUrls];
    
    URL.revokeObjectURL(newPreviewUrls[index].url);
    
    newFiles.splice(index, 1);
    newPreviewUrls.splice(index, 1);
    
    setFiles(newFiles);
    setPreviewUrls(newPreviewUrls);
    if (currentImageIndex >= newPreviewUrls.length) {
      setCurrentImageIndex(Math.max(0, newPreviewUrls.length - 1));
    }
    if (newFiles.length === 0 && !caption) {
       // Optional: collapse if empty
    }
  };

  const handleSubmit = () => {
    if (files.length === 0) {
      toast('Vui lòng chọn ít nhất một ảnh hoặc video!', 'error');
      return;
    }

    setIsSubmitting(true);

    const payload = new FormData();
    payload.append('name', 'Bài viết mới');
    payload.append('description', caption);
    files.forEach(file => {
      payload.append('imgUpload', file);
    });
    payload.append('owner', currentUser?.email || 'anonymous');
    if (feeling) payload.append('feeling', `${feeling.label} ${feeling.icon}`);

    fetch(`${API_URL}/posts`, {
      method: 'POST',
      body: payload,
    })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || 'Không thể đăng bài');
        }
        return res.json();
      })
      .then((newPost) => {
        toast('Đăng bài viết thành công!', 'success');
        setKois(prev => [newPost, ...prev]);
        setFiles([]);
        setPreviewUrls([]);
        setCaption('');
        setIsExpanded(false);
        setFeeling(null);
        setShowFeelings(false);
      })
      .catch(err => toast(err.message, 'error'))
      .finally(() => setIsSubmitting(false));
  };

  const scrollPrev = () => {
    if (previewCarouselRef.current) {
      previewCarouselRef.current.scrollBy({ left: -previewCarouselRef.current.clientWidth, behavior: 'smooth' });
    }
  };

  const scrollNext = () => {
    if (previewCarouselRef.current) {
      previewCarouselRef.current.scrollBy({ left: previewCarouselRef.current.clientWidth, behavior: 'smooth' });
    }
  };

  if (loading) return <div className="feed-loading">Đang tải bảng tin...</div>;

  return (
    <div className="feed-container">
      <div className="feed-list">
        {currentUser && (
          <div className="feed-card create-post-widget">
            <div className="create-post-top">
              <div className="feed-avatar">
                <img src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}&background=random&color=fff`} alt="Avatar" />
              </div>
              <div className="create-post-input-wrapper" style={{flex: 1}}>
                {feeling && (
                  <div className="feeling-tag">
                    <span>Đang cảm thấy {feeling.icon} {feeling.label}</span>
                    <button onClick={(e) => { e.stopPropagation(); setFeeling(null); }} style={{border: 'none', background: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '16px', color: '#c2410c', display: 'flex'}}>
                      <span className="material-symbols-outlined" style={{fontSize: '16px'}}>close</span>
                    </button>
                  </div>
                )}
                <input 
                  className="create-post-input" 
                  placeholder={currentUser.displayName ? `${currentUser.displayName}, bạn đang nghĩ gì?` : 'Bạn đang nghĩ gì thế?'}
                  value={caption}
                  onChange={e => {
                    setCaption(e.target.value);
                    if (!isExpanded) setIsExpanded(true);
                  }}
                  onClick={() => setIsExpanded(true)}
                />
              </div>
            </div>

            {isExpanded && (
              <div className="create-post-expanded">
                {previewUrls.length > 0 && (
                  <div className="create-post-previews" style={{ position: 'relative' }}>
                    <div 
                      className="create-post-carousel" 
                      ref={previewCarouselRef}
                      onScroll={(e) => setCurrentImageIndex(Math.round(e.target.scrollLeft / e.target.clientWidth))}
                      style={{height: '300px', borderRadius: '12px', marginBottom: '12px'}}>
                      {previewUrls.map((item, idx) => (
                        <div key={idx} style={{ flex: '0 0 100%', scrollSnapAlign: 'center', position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden' }}>
                          {item.type.startsWith('video/') ? (
                            <video src={item.url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <img 
                              src={item.url} 
                              alt={`Preview ${idx}`} 
                              style={{ width: '100%', height: '100%', objectFit: 'contain', ...filters.find(f => f.class === selectedFilter)?.style }} 
                            />
                          )}
                          {item.duration && (
                            <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                              {new Date(item.duration * 1000).toISOString().substr(14, 5)}
                            </div>
                          )}
                          <button
                            onClick={() => removeFile(idx)}
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              background: 'rgba(0,0,0,0.6)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '28px',
                              height: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              zIndex: 10
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                    {currentImageIndex > 0 && (
                      <button className="carousel-nav-btn prev" onClick={(e) => { e.preventDefault(); scrollPrev(); }} style={{ left: '8px' }}>
                        <span className="material-symbols-outlined" style={{fontSize: '20px', color: '#1e293b'}}>chevron_left</span>
                      </button>
                    )}
                    {currentImageIndex < previewUrls.length - 1 && (
                      <button className="carousel-nav-btn next" onClick={(e) => { e.preventDefault(); scrollNext(); }} style={{ right: '8px' }}>
                        <span className="material-symbols-outlined" style={{fontSize: '20px', color: '#1e293b'}}>chevron_right</span>
                      </button>
                    )}
                    {/* Filters could be added here if needed */}
                  </div>
                )}

                <div className="create-post-actions">
                  <label className="create-action-btn">
                    <span className="material-symbols-outlined" style={{color: '#45bd62'}}>photo_library</span>
                    <span>Ảnh/Video</span>
                    <input type="file" onChange={handleFileChange} accept="image/*,video/*" multiple style={{ display: 'none' }} />
                  </label>
                  <button className={`create-action-btn ${showFeelings ? 'active' : ''}`} onClick={() => setShowFeelings(!showFeelings)}>
                    <span className="material-symbols-outlined" style={{color: '#f7b928'}}>sentiment_satisfied</span>
                    <span>Cảm xúc</span>
                  </button>
                </div>

                {showFeelings && (
                  <div className="feelings-grid">
                    {feelingsList.map((f) => (
                      <button
                        key={f.label}
                        className={`feeling-item ${feeling?.label === f.label ? 'active' : ''}`}
                        onClick={() => {
                          setFeeling(f);
                          setShowFeelings(false);
                        }}
                      >
                        <span className="feeling-icon">{f.icon}</span>
                        <span className="feeling-label">{f.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '12px', gap: '8px', width: '100%'}}>
                   <button 
                    className="btn secondary" 
                    style={{ flex: 1 }}
                    onClick={() => { setIsExpanded(false); setFiles([]); setPreviewUrls([]); setCaption(''); setFeeling(null); setShowFeelings(false); }}
                    disabled={isSubmitting}
                   >
                     Hủy
                   </button>
                   <button 
                    className="btn primary" 
                    style={{ flex: 1 }}
                    onClick={handleSubmit}
                    disabled={isSubmitting || (!caption.trim() && files.length === 0)}
                   >
                     {isSubmitting ? 'Đang đăng...' : 'Đăng'}
                   </button>
                </div>
              </div>
            )}
          </div>
        )}

        {kois.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#8e8e8e'}}>
            <span className="material-symbols-outlined" style={{fontSize: '48px'}}>photo_camera</span>
            <p>Chưa có bài đăng nào. Hãy là người đầu tiên!</p>
          </div>
        ) : (
          kois.map(koi => (
            <FeedCard
              key={koi.id}
              koi={koi}
              currentUser={currentUser}
              onRemove={(id) => setKois(prev => prev.filter(item => item.id !== id))}
            />
          ))
        )}
      </div>
      <aside className="feed-right-panel">
        <h3>Cá Koi mới định danh</h3>
        {pendingIdentities.length === 0 ? (
          <p>Không có hồ sơ chờ duyệt.</p>
        ) : (
          pendingIdentities.map((koi) => (
            <div key={koi.id} className="koi-identity-card">
              <div className="koi-identity-thumb">
                <img src={koi.img ? getImageUrl(koi.img) : 'https://placehold.co/120x120?text=KOI'} alt={koi.name} />
              </div>
              <div>
                <strong>{koi.name || koi.id}</strong>
                <p>{koi.owner?.split('@')[0] || 'Người dùng'}</p>
                <small>{koi.variety || 'Koi'}</small>
              </div>
            </div>
          ))
        )}
        <button type="button" className="btn-secondary" onClick={() => navigate('/explore')}>Xem toàn bộ hồ sơ</button>
      </aside>
    </div>
  );
};

export default GalleryPage;
