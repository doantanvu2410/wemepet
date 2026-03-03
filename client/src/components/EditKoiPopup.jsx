import React, { useState } from 'react';
import { API_URL, compressImage } from '../utils';

const EditKoiPopup = ({ koi, onUpdate, onClose }) => {
  const [formData, setFormData] = useState({
    name: koi.name || '',
    variety: koi.variety || '',
    breeder: koi.breeder || '',
    year: koi.year || '',
    size: koi.size || '',
    kg: koi.kg || '',
    gender: koi.gender || '',
    description: koi.description || '',
  });
  const [file, setFile] = useState(null);

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleSubmit = () => {
    if (!formData.name) {
      alert('Vui lòng nhập tên cá!');
      return;
    }
    if (!formData.variety) {
      alert('Vui lòng nhập dòng cá!');
      return;
    }
    if (!formData.breeder) {
      alert('Vui lòng nhập tên trại!');
      return;
    }
    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      payload.append(key, value);
    });
    if (file) payload.append('imgUpload', file);
    if (koi.status === 'rejected') {
      payload.append('status', 'approved');
    }

    fetch(`${API_URL}/kois/${koi.id}`, {
      method: 'PUT',
      body: payload,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Lỗi cập nhật');
        return res.json();
      })
      .then(() => onUpdate())
      .catch((err) => console.error(err));
  };

  return (
    <div className="modal-card modal-lg modal-tall">
      <div className="modal-header">
        <div className="modal-spacer" />
        <span className="modal-title">Cập nhật thông tin</span>
        <button onClick={onClose} className="modal-close">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="modal-body scroll-y">
        <div className="info-chip">Mã số: <strong>{koi.id}</strong></div>
        <input value={formData.name} onChange={handleChange('name')} placeholder="Tên cá *" className="input-field" />
        <div className="form-grid-2">
          <input value={formData.variety} onChange={handleChange('variety')} placeholder="Dòng *" className="input-field" />
          <input value={formData.breeder} onChange={handleChange('breeder')} placeholder="Trại *" className="input-field" />
        </div>
        <div className="form-grid-3">
          <input value={formData.year} type="number" onChange={handleChange('year')} placeholder="Năm" className="input-field" />
          <input value={formData.size} type="number" onChange={handleChange('size')} placeholder="cm" className="input-field" />
          <input value={formData.kg} type="number" step="0.1" onChange={handleChange('kg')} placeholder="kg" className="input-field" />
        </div>
        <select value={formData.gender} onChange={handleChange('gender')} className="input-field">
          <option value="">Chọn giới tính</option>
          <option value="Male">Đực (Male)</option>
          <option value="Female">Cái (Female)</option>
          <option value="Unspecified">Chưa xác định</option>
        </select>
        <textarea value={formData.description} onChange={handleChange('description')} placeholder="Mô tả thêm" className="input-field textarea-field" />
        
        <div>
          <div className="form-label">Ảnh mới (tùy chọn)</div>
          <input type="file" onChange={async (event) => {
             const f = event.target.files?.[0];
             if (f) {
               if (f.type.startsWith('image/')) {
                 try {
                   const compressed = await compressImage(f);
                   setFile(compressed);
                 } catch { setFile(f); }
               } else {
                 setFile(f);
               }
             } else {
               setFile(null);
             }
          }} className="text-sm" />
        </div>

        <button onClick={handleSubmit} className="btn dark full mt-4">
          Lưu thay đổi
        </button>
      </div>
    </div>
  );
};

export default EditKoiPopup;
