import React, { useState, useEffect } from 'react';
import { API_URL, compressImage } from '../utils';
import { useToast } from './Toast';

const SubmitKoiPopup = ({ ownerEmail, onSubmit, onClose }) => {
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [caption, setCaption] = useState('');
  const [taggedUsers, setTaggedUsers] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const toast = useToast();

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
      const selectedFiles = Array.from(event.target.files);
      
      const processedFiles = await Promise.all(selectedFiles.map(async (file) => {
        if (file.type.startsWith('image/')) {
          try {
            return await compressImage(file);
          } catch (e) { return file; }
        }
        return file;
      }));

      setFiles(processedFiles);
      const urls = processedFiles.map(f => ({
        url: URL.createObjectURL(f),
        type: f.type
      }));
      setPreviewUrls(urls);
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
    if (taggedUsers) payload.append('taggedUsers', taggedUsers);
    files.forEach(file => {
      payload.append('imgUpload', file);
    });
    payload.append('owner', ownerEmail || 'anonymous');

    fetch(`${API_URL}/posts`, {
      method: 'POST',
      body: payload,
    })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || 'Không thể lưu');
        }
        return res.json();
      })
      .then(() => {
        toast('Đăng bài viết thành công!', 'success');
        onSubmit();
      })
      .catch((err) => {
        console.error(err);
        toast(`Lỗi khi đăng bài: ${err.message}`, 'error');
      })
      .finally(() => setIsSubmitting(false));
  };

  // Styles
  const containerStyle = {
    width: '100%',
    background: 'white',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    maxHeight: '90vh',
    // Match RegisterKoiPopup style
    maxWidth: '400px',
  };

  const headerStyle = {
    padding: '16px 24px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontWeight: 700,
    fontSize: '1rem',
    color: '#1e293b',
    background: '#fff',
  };

  const bodyStyle = {
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  };

  const sectionLabelStyle = {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#64748b',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const uploadBoxStyle = {
    width: '100%',
    minHeight: '320px',
    borderRadius: '16px',
    border: '2px dashed #cbd5e1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: '#f8fafc',
    transition: 'all 0.2s',
    position: 'relative',
    overflow: 'hidden',
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
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ width: '32px' }}></div>
        <span>Tạo bài viết mới</span>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#64748b' }}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div style={bodyStyle}>
        {/* Image Upload / Preview */}
        <div style={{...uploadBoxStyle, cursor: previewUrls.length > 0 ? 'default' : 'pointer', position: 'relative', padding: 0, border: previewUrls.length > 0 ? 'none' : uploadBoxStyle.border}}>
          {previewUrls.length > 0 ? (
            <>
              <div 
                className="create-post-carousel"
                onScroll={(e) => setCurrentImageIndex(Math.round(e.target.scrollLeft / e.target.clientWidth))}
                style={{ borderRadius: '16px' }}
              >
                {previewUrls.map((item, idx) => (
                  <div key={idx} style={{ flex: '0 0 100%', scrollSnapAlign: 'center', position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden' }}>
                    {item.type.startsWith('video') || item.url.match(/\.(mp4|webm|ogg|mov|qt|avi|wmv|flv|m4v)$/i) ? (
                      <video src={item.url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <img 
                        src={item.url} 
                        alt={`Preview ${idx}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', ...filters.find(f => f.class === selectedFilter)?.style }} 
                      />
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); removeFile(idx); }}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                        zIndex: 10
                      }}
                      title="Xóa file này"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                    </button>
                  </div>
                ))}
              </div>
              
              {previewUrls.length > 1 && (
                <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 10, padding: '4px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', backdropFilter: 'blur(2px)' }}>
                  {previewUrls.map((_, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: idx === currentImageIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                        transition: 'background 0.2s'
                      }} 
                    />
                  ))}
                </div>
              )}

              <label style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(255,255,255,0.9)', color: '#1e293b', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 10 }}>
                <span className="material-symbols-outlined" style={{fontSize: '16px'}}>add_photo_alternate</span>
                <span>Thêm/Sửa</span>
                <input type="file" onChange={handleFileChange} accept="image/*,video/*" multiple style={{ display: 'none' }} />
              </label>
            </>
          ) : (
            <label style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#94a3b8' }}>add_a_photo</span>
              <span style={{ marginTop: '8px', color: '#64748b', fontWeight: 500 }}>Chọn nhiều ảnh/video</span>
              <input type="file" onChange={handleFileChange} accept="image/*,video/*" multiple style={{ display: 'none' }} />
            </label>
          )}
        </div>

        {previewUrls.length > 0 && (
          <>
            {/* Filters */}
            <div>
              <div style={sectionLabelStyle}>Bộ lọc</div>
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                {filters.map(f => (
                  <div 
                    key={f.class} 
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', minWidth: '70px' }}
                    onClick={() => setSelectedFilter(f.class)}
                  >
                    <div style={{ width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: selectedFilter === f.class ? '2px solid #111827' : '2px solid transparent', ...f.style }}>
                      {previewUrls[0].type.startsWith('video') || previewUrls[0].url.match(/\.(mp4|webm|ogg|mov|qt|avi|wmv|flv|m4v)$/i) ? (
                        <video src={previewUrls[0].url} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                      ) : (
                        <img src={previewUrls[0].url} alt={f.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                      )}
                    </div>
                    <span style={{fontSize: '11px', fontWeight: 500, color: selectedFilter === f.class ? '#111827' : '#64748b'}}>{f.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Caption */}
            <div>
              <div style={sectionLabelStyle}>Nội dung</div>
              <textarea 
                value={caption} 
                onChange={(e) => setCaption(e.target.value)} 
                placeholder="Viết chú thích..." 
                style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }} 
              />
            </div>

            {/* Tagging */}
            <div>
              <div style={sectionLabelStyle}>Gắn thẻ</div>
              <input 
                value={taggedUsers} 
                onChange={(e) => setTaggedUsers(e.target.value)} 
                placeholder="Nhập tên người dùng (ví dụ: nam, lan)..." 
                style={inputStyle} 
              />
            </div>
            
            {/* Submit Button */}
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting} 
              style={{ 
                width: '100%', 
                padding: '14px', 
                borderRadius: '12px', 
                border: 'none', 
                background: '#111827', 
                color: 'white', 
                fontWeight: 600, 
                fontSize: '1rem', 
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                marginTop: '10px'
              }}
            >
              {isSubmitting ? 'Đang chia sẻ...' : 'Chia sẻ bài viết'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SubmitKoiPopup;