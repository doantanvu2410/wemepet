import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="not-found-illustration">
          <span className="material-symbols-outlined">sentiment_dissatisfied</span>
        </div>
        <h1 className="not-found-title">404 - Không tìm thấy trang</h1>
        <p className="not-found-text">
          Rất tiếc, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
          Hãy thử quay lại trang chủ xem sao nhé.
        </p>
        <Link to="/" className="btn primary">
          Quay về trang chủ
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;