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

  return (
    <div className="modal-card modal-sm modal-tall">
      <div className="modal-header">
        <div className="modal-spacer" />
        <span className="modal-title">Tạo bài viết mới</span>
        <button onClick={onClose} className="modal-close">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div className="modal-body gap-20 scroll-y">
        {/* Image Upload / Preview */}
        <div className={`create-post-upload ${previewUrls.length > 0 ? 'has-preview' : ''}`}>
          {previewUrls.length > 0 ? (
            <>
              <div 
                className="create-post-carousel modal-preview"
                onScroll={(e) => setCurrentImageIndex(Math.round(e.target.scrollLeft / e.target.clientWidth))}
              >
                {previewUrls.map((item, idx) => (
                  <div key={idx} className="create-post-preview-item">
                    {item.type.startsWith('video') || item.url.match(/\.(mp4|webm|ogg|mov|qt|avi|wmv|flv|m4v)$/i) ? (
                      <video src={item.url} controls className="create-post-preview-media" />
                    ) : (
                      <img 
                        src={item.url} 
                        alt={`Preview ${idx}`} 
                        className="create-post-preview-media"
                        style={{ ...filters.find(f => f.class === selectedFilter)?.style }} 
                      />
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); removeFile(idx); }}
                      className="create-post-remove lg"
                      title="Xóa file này"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                ))}
              </div>
              
              {previewUrls.length > 1 && (
                <div className="carousel-dots">
                  {previewUrls.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`carousel-dot ${idx === currentImageIndex ? 'active' : ''}`}
                    />
                  ))}
                </div>
              )}

              <label className="create-post-edit">
                <span className="material-symbols-outlined">add_photo_alternate</span>
                <span>Thêm/Sửa</span>
                <input type="file" onChange={handleFileChange} accept="image/*,video/*" multiple className="file-input-hidden" />
              </label>
            </>
          ) : (
            <label className="create-post-empty">
              <span className="material-symbols-outlined create-post-empty-icon">add_a_photo</span>
              <span className="create-post-empty-text">Chọn nhiều ảnh/video</span>
              <input type="file" onChange={handleFileChange} accept="image/*,video/*" multiple className="file-input-hidden" />
            </label>
          )}
        </div>

        {previewUrls.length > 0 && (
          <>
            {/* Filters */}
            <div>
              <div className="form-label">Bộ lọc</div>
              <div className="filter-strip">
                {filters.map(f => (
                  <button 
                    key={f.class} 
                    type="button"
                    className={`filter-option ${selectedFilter === f.class ? 'active' : ''}`}
                    onClick={() => setSelectedFilter(f.class)}
                  >
                    <div className="filter-thumb-square" style={{ ...f.style }}>
                      {previewUrls[0].type.startsWith('video') || previewUrls[0].url.match(/\.(mp4|webm|ogg|mov|qt|avi|wmv|flv|m4v)$/i) ? (
                        <video src={previewUrls[0].url} />
                      ) : (
                        <img src={previewUrls[0].url} alt={f.name} />
                      )}
                    </div>
                    <span className="filter-label">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Caption */}
            <div>
              <div className="form-label">Nội dung</div>
              <textarea 
                value={caption} 
                onChange={(e) => setCaption(e.target.value)} 
                placeholder="Viết chú thích..." 
                className="input-field textarea-field"
              />
            </div>

            {/* Tagging */}
            <div>
              <div className="form-label">Gắn thẻ</div>
              <input 
                value={taggedUsers} 
                onChange={(e) => setTaggedUsers(e.target.value)} 
                placeholder="Nhập tên người dùng (ví dụ: nam, lan)..." 
                className="input-field"
              />
            </div>
            
            {/* Submit Button */}
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting} 
              className="btn dark full mt-4"
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
