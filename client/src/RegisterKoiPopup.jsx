import React, { useState, useEffect } from 'react';
import { API_URL, compressImage } from './utils';
import { useToast } from './components/Toast';

const RegisterKoiPopup = ({ ownerEmail, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    variety: '',
    breeder: '',
    year: '',
    size: '',
    kg: '',
    gender: '',
    description: '',
    fatherId: '',
    motherId: '',
  });
  const [files, setFiles] = useState([null, null, null, null]); // 4 slots cho 4 góc
  const [certificateFile, setCertificateFile] = useState(null);
  const [previewUrls, setPreviewUrls] = useState([null, null, null, null]);
  const [certPreviewUrl, setCertPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    return () => {
      previewUrls.forEach(url => { if (url) URL.revokeObjectURL(url); });
      if (certPreviewUrl) URL.revokeObjectURL(certPreviewUrl);
    };
  }, [previewUrls, certPreviewUrl]);

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleFileChange = (index) => async (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      let fileToUse = selectedFile;
      if (selectedFile.type.startsWith('image/')) {
        try {
          fileToUse = await compressImage(selectedFile);
        } catch (e) { console.error(e); }
      }

      const newFiles = [...files];
      newFiles[index] = fileToUse;
      setFiles(newFiles);

      const newPreviewUrls = [...previewUrls];
      if (newPreviewUrls[index]) URL.revokeObjectURL(newPreviewUrls[index]);
      newPreviewUrls[index] = URL.createObjectURL(fileToUse);
      setPreviewUrls(newPreviewUrls);
    }
  };

  const handleCertFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setCertificateFile(selectedFile);
      setCertPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.variety || !formData.breeder || !files[0]) {
      toast('Vui lòng điền đủ: Tên, Dòng, Trại và Ảnh chính!', 'error');
      return;
    }

    setIsSubmitting(true);
    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) payload.append(key, value);
    });
    payload.append('type', 'koi_identity'); // Đánh dấu đây là hồ sơ định danh
    files.forEach(file => {
      if (file) payload.append('imgUpload', file);
    });
    if (certificateFile) {
      payload.append('certificate', certificateFile);
    }
    payload.append('owner', ownerEmail || 'anonymous');
    payload.append('status', 'pending'); // Mặc định chờ duyệt

    fetch(`${API_URL}/kois`, {
      method: 'POST',
      body: payload,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(() => {
        toast('Hồ sơ định danh đã được gửi thành công!', 'success');
        onSubmit();
      })
      .catch((err) => {
        console.error(err);
        toast(`Lỗi: ${err.message}`, 'error');
      })
      .finally(() => setIsSubmitting(false));
  };

  // Styles
  const containerStyle = {
    width: '100%',
    maxWidth: '600px',
    background: 'white',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    overflow: 'hidden',
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
  };

  const uploadBoxStyle = {
    width: '100%',
    height: '160px',
    borderRadius: '16px',
    border: '2px dashed #cbd5e1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: '#f8fafc',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ width: '32px' }}></div>
        <span>Đăng ký định danh Cá Koi</span>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#64748b' }}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div style={bodyStyle}>
        {/* Image Upload */}
        <div>
          <div style={sectionLabelStyle}>Hình ảnh (Chụp hoặc tải 4 góc)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {previewUrls.map((url, index) => (
              <label key={index} style={uploadBoxStyle}>
                {url ? (
                  <img src={url} alt={`Góc ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#94a3b8' }}>add_a_photo</span>
                    <span style={{ marginTop: '4px', color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>
                      {index === 0 ? 'Góc trên (Chính)' : index === 1 ? 'Góc bên' : index === 2 ? 'Cận đầu' : 'Cận đuôi'}
                    </span>
                  </>
                )}
                <input type="file" onChange={handleFileChange(index)} accept="image/*" style={{ display: 'none' }} />
                {url && (
                  <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600 }}>Sửa</div>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Basic Info */}
        <div>
          <div style={sectionLabelStyle}>Thông tin cơ bản</div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <input value={formData.name} onChange={handleChange('name')} placeholder="Tên gọi (Ví dụ: Kohaku Champion)" style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input value={formData.variety} onChange={handleChange('variety')} placeholder="Dòng (Variety)" style={inputStyle} />
              <input value={formData.breeder} onChange={handleChange('breeder')} placeholder="Trại (Breeder)" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div>
          <div style={sectionLabelStyle}>Chỉ số vật lý</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input value={formData.year} type="number" onChange={handleChange('year')} placeholder="Năm sinh" style={inputStyle} />
            <select value={formData.gender} onChange={handleChange('gender')} style={inputStyle}>
              <option value="">Giới tính</option>
              <option value="Male">Đực (Male)</option>
              <option value="Female">Cái (Female)</option>
              <option value="Unspecified">Chưa rõ</option>
            </select>
            <input value={formData.size} type="number" onChange={handleChange('size')} placeholder="Kích thước (cm)" style={inputStyle} />
            <input value={formData.kg} type="number" step="0.1" onChange={handleChange('kg')} placeholder="Cân nặng (kg)" style={inputStyle} />
          </div>
        </div>
        
        {/* Lineage & Description */}
        <div>
          <div style={sectionLabelStyle}>Thông tin bổ sung</div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input value={formData.fatherId} onChange={handleChange('fatherId')} placeholder="ID Cá Bố (Tùy chọn)" style={inputStyle} />
              <input value={formData.motherId} onChange={handleChange('motherId')} placeholder="ID Cá Mẹ (Tùy chọn)" style={inputStyle} />
            </div>
            <textarea 
              value={formData.description} 
              onChange={handleChange('description')} 
              placeholder="Mô tả chi tiết về nguồn gốc, đặc điểm..." 
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }} 
            />
          </div>
        </div>

        {/* Certificate */}
        <div>
          <div style={sectionLabelStyle}>Giấy chứng nhận</div>
          <label style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'white' }}>
            <span className="material-symbols-outlined" style={{ color: '#64748b' }}>upload_file</span>
            <span style={{ flex: 1, color: certificateFile ? '#0f172a' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {certificateFile ? certificateFile.name : 'Tải lên ảnh chứng nhận (nếu có)'}
            </span>
            <input type="file" onChange={handleCertFileChange} accept="image/*,.pdf" style={{ display: 'none' }} />
          </label>
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
          {isSubmitting ? 'Đang xử lý...' : 'Gửi hồ sơ định danh'}
        </button>
      </div>
    </div>
  );
};

export default RegisterKoiPopup;
