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

  // Styles
  const containerStyle = {
    width: '100%',
    maxWidth: '500px',
    background: 'white',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
  };

  const headerStyle = {
    padding: '16px 24px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontWeight: 700,
    fontSize: '1.2rem',
    color: '#1e293b',
    background: '#fff',
  };

  const bodyStyle = {
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
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
    boxSizing: 'border-box'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ width: '32px' }}></div>
        <span>Cập nhật thông tin</span>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#64748b' }}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div style={bodyStyle}>
        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', background: '#f1f5f9', padding: '8px', borderRadius: '8px' }}>Mã số: <strong>{koi.id}</strong></div>
        <input value={formData.name} onChange={handleChange('name')} placeholder="Tên cá *" style={inputStyle} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <input value={formData.variety} onChange={handleChange('variety')} placeholder="Dòng *" style={inputStyle} />
          <input value={formData.breeder} onChange={handleChange('breeder')} placeholder="Trại *" style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <input value={formData.year} type="number" onChange={handleChange('year')} placeholder="Năm" style={inputStyle} />
          <input value={formData.size} type="number" onChange={handleChange('size')} placeholder="cm" style={inputStyle} />
          <input value={formData.kg} type="number" step="0.1" onChange={handleChange('kg')} placeholder="kg" style={inputStyle} />
        </div>
        <select value={formData.gender} onChange={handleChange('gender')} style={inputStyle}>
          <option value="">Chọn giới tính</option>
          <option value="Male">Đực (Male)</option>
          <option value="Female">Cái (Female)</option>
          <option value="Unspecified">Chưa xác định</option>
        </select>
        <textarea value={formData.description} onChange={handleChange('description')} placeholder="Mô tả thêm" style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }} />
        
        <div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>Ảnh mới (tùy chọn)</div>
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
          }} style={{ fontSize: '0.9rem' }} />
        </div>

        <button onClick={handleSubmit} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#111827', color: 'white', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', marginTop: '8px' }}>
          Lưu thay đổi
        </button>
      </div>
    </div>
  );
};

export default EditKoiPopup;
