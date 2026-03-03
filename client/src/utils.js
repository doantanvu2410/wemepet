// Cấu hình API Endpoint (Tách biệt Backend & Frontend)
export const API_URL = 'http://localhost:5001/api';

export const getImageUrl = (path) => {
  if (!path) return 'https://placehold.co/600x400?text=No+Image';
  if (path.startsWith('http')) return path;
  return `http://localhost:5001${path.startsWith('/') ? '' : '/'}${path}`;
};

export const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " năm trước";
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " tháng trước";
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " ngày trước";
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " giờ trước";
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " phút trước";
  
  return "Vừa xong";
};

export const getAvatarUrl = (name) => {
  const safeName = name ? name.split('@')[0] : 'User';
  return `https://ui-avatars.com/api/?name=${safeName}&background=random&color=fff`;
};

// Helper để gọi API gọn gàng hơn (Optional)
export const fetchAPI = async (endpoint, options = {}) => {
  const res = await fetch(`${API_URL}${endpoint}`, options);
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'API Error');
  }
  return res.json();
};

// Hàm nén ảnh sử dụng Canvas
export const compressImage = async (file, { quality = 0.7, maxWidth = 1920, maxHeight = 1920 } = {}) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Tính toán kích thước mới giữ nguyên tỷ lệ
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas is empty'));
              return;
            }
            // Tạo file mới từ blob, giữ tên cũ nhưng đổi đuôi thành .jpg (vì canvas toBlob mặc định là png hoặc jpg)
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const cropImageToSquare = async (file, { size = 512, quality = 0.85 } = {}) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const minSide = Math.min(img.width, img.height);
        const sx = Math.floor((img.width - minSide) / 2);
        const sy = Math.floor((img.height - minSide) / 2);

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas is empty'));
              return;
            }
            const croppedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(croppedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
