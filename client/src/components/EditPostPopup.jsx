import React, { useState } from 'react';
import { API_URL, compressImage } from '../utils';
import { useToast } from './Toast';

const EditPostPopup = ({ post, onClose, onSaved }) => {
  const [caption, setCaption] = useState(post.description || '');
  const [taggedUsers, setTaggedUsers] = useState(post.taggedUsers || '');
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleFileChange = async (event) => {
    const selected = Array.from(event.target.files || []);
    const processed = await Promise.all(
      selected.map(async (file) => {
        if (file.type.startsWith('image/')) {
          try {
            return await compressImage(file);
          } catch (e) {
            return file;
          }
        }
        return file;
      })
    );
    setFiles(processed);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('description', caption);
      payload.append('taggedUsers', taggedUsers);
      files.forEach((file) => payload.append('imgUpload', file));

      const res = await fetch(`${API_URL}/posts/${post.id}`, {
        method: 'PUT',
        body: payload,
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      onSaved?.(updated);
      toast('Đã cập nhật bài viết.', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      toast(`Lỗi: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-card modal-lg">
      <div className="modal-header">
        <div className="modal-spacer" />
        <span className="modal-title">Chỉnh sửa bài viết</span>
        <button onClick={onClose} className="modal-close">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="modal-body">
        <div>
          <div className="form-label">Nội dung</div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            className="input-field textarea-field"
          />
        </div>
        <div>
          <div className="form-label">Gắn thẻ</div>
          <input
            value={taggedUsers}
            onChange={(e) => setTaggedUsers(e.target.value)}
            placeholder="Ví dụ: nam, lan"
            className="input-field"
          />
        </div>
        <div>
          <div className="form-label">Thay ảnh (tùy chọn)</div>
          <input type="file" multiple accept="image/*,video/*" onChange={handleFileChange} />
          <p className="helper-text text-xs mt-4">
            Nếu chọn ảnh/video mới, hệ thống sẽ thay toàn bộ media cũ.
          </p>
        </div>
        <button className="btn primary full mt-4" onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  );
};

export default EditPostPopup;
