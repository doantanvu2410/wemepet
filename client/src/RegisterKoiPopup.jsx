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

  return (
    <div className="modal-card modal-xl modal-tall">
      <div className="modal-header">
        <div className="modal-spacer" />
        <span className="modal-title">Đăng ký định danh Cá Koi</span>
        <button onClick={onClose} className="modal-close">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div className="modal-body gap-20 scroll-y">
        {/* Image Upload */}
        <div>
          <div className="form-label">Hình ảnh (Chụp hoặc tải 4 góc)</div>
          <div className="koi-upload-grid">
            {previewUrls.map((url, index) => (
              <label key={index} className="koi-upload-tile">
                {url ? (
                  <img src={url} alt={`Góc ${index + 1}`} className="koi-upload-image" />
                ) : (
                  <>
                    <span className="material-symbols-outlined koi-upload-icon">add_a_photo</span>
                    <span className="koi-upload-text">
                      {index === 0 ? 'Góc trên (Chính)' : index === 1 ? 'Góc bên' : index === 2 ? 'Cận đầu' : 'Cận đuôi'}
                    </span>
                  </>
                )}
                <input type="file" onChange={handleFileChange(index)} accept="image/*" className="file-input-hidden" />
                {url && (
                  <div className="koi-upload-edit">Sửa</div>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Basic Info */}
        <div>
          <div className="form-label">Thông tin cơ bản</div>
          <div className="stack-12">
            <input value={formData.name} onChange={handleChange('name')} placeholder="Tên gọi (Ví dụ: Kohaku Champion)" className="input-field" />
            <div className="form-grid-2">
              <input value={formData.variety} onChange={handleChange('variety')} placeholder="Dòng (Variety)" className="input-field" />
              <input value={formData.breeder} onChange={handleChange('breeder')} placeholder="Trại (Breeder)" className="input-field" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div>
          <div className="form-label">Chỉ số vật lý</div>
          <div className="form-grid-2">
            <input value={formData.year} type="number" onChange={handleChange('year')} placeholder="Năm sinh" className="input-field" />
            <select value={formData.gender} onChange={handleChange('gender')} className="input-field">
              <option value="">Giới tính</option>
              <option value="Male">Đực (Male)</option>
              <option value="Female">Cái (Female)</option>
              <option value="Unspecified">Chưa rõ</option>
            </select>
            <input value={formData.size} type="number" onChange={handleChange('size')} placeholder="Kích thước (cm)" className="input-field" />
            <input value={formData.kg} type="number" step="0.1" onChange={handleChange('kg')} placeholder="Cân nặng (kg)" className="input-field" />
          </div>
        </div>
        
        {/* Lineage & Description */}
        <div>
          <div className="form-label">Thông tin bổ sung</div>
          <div className="stack-12">
            <div className="form-grid-2">
              <input value={formData.fatherId} onChange={handleChange('fatherId')} placeholder="ID Cá Bố (Tùy chọn)" className="input-field" />
              <input value={formData.motherId} onChange={handleChange('motherId')} placeholder="ID Cá Mẹ (Tùy chọn)" className="input-field" />
            </div>
            <textarea 
              value={formData.description} 
              onChange={handleChange('description')} 
              placeholder="Mô tả chi tiết về nguồn gốc, đặc điểm..." 
              className="input-field textarea-field"
            />
          </div>
        </div>

        {/* Certificate */}
        <div>
          <div className="form-label">Giấy chứng nhận</div>
          <label className={`input-field file-upload ${certificateFile ? 'has-file' : ''}`}>
            <span className="material-symbols-outlined">upload_file</span>
            <span className="file-upload-name">
              {certificateFile ? certificateFile.name : 'Tải lên ảnh chứng nhận (nếu có)'}
            </span>
            <input type="file" onChange={handleCertFileChange} accept="image/*,.pdf" className="file-input-hidden" />
          </label>
        </div>

        {/* Submit Button */}
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting} 
          className="btn dark full mt-4"
        >
          {isSubmitting ? 'Đang xử lý...' : 'Gửi hồ sơ định danh'}
        </button>
      </div>
    </div>
  );
};

export default RegisterKoiPopup;
