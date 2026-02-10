import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getImageUrl, getRelativeTime, API_URL } from '../utils';
import { useToast } from './Toast';

const buildCommentTree = (comments = []) => {
  const map = {};
  const roots = [];

  comments.forEach(comment => {
    map[comment.id] = { ...comment, children: [] };
  });

  comments.forEach(comment => {
    if (comment.parentId && map[comment.parentId]) {
      map[comment.parentId].children.push(map[comment.id]);
    } else {
      roots.push(map[comment.id]);
    }
  });

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    nodes.forEach(node => {
      if (node.children?.length) sortNodes(node.children);
    });
  };

  sortNodes(roots);
  return roots;
};

const CommentNode = ({
  node,
  depth,
  onReply,
  activeReplyId,
  replyText,
  onReplyChange,
  onSubmitReply,
  onCancelReply,
  currentUser,
  onDelete,
  owner,
}) => {
  const commenter = node.userId?.split('@')[0] || 'Người dùng';
  const showReplyForm = activeReplyId === node.id;

  return (
    <div className={`comment-node depth-${Math.min(depth, 4)}`}>
      <div className="comment-card">
        <div className="comment-card-header">
          <div className="feed-avatar">
            <img src={`https://ui-avatars.com/api/?name=${node.userId}&background=random&color=fff`} alt={node.userId} />
          </div>
          <div>
            <strong>{commenter}</strong>
            <div className="comment-card-meta">
              <p className="comment-text">{node.text}</p>
              <div className="comment-card-meta-time">
                <span className="post-detail-comment-time">{getRelativeTime(node.createdAt)}</span>
                {(currentUser?.email === node.userId || currentUser?.email === owner) && (
                  <button
                    type="button"
                    className="reply-link secondary"
                    onClick={() => onDelete(node.id)}
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="comment-actions">
          <button type="button" className="reply-link" onClick={() => onReply(node)}>
            Trả lời
          </button>
          {node.children?.length > 0 && (
            <span className="comment-children-count">{node.children.length} phản hồi</span>
          )}
        </div>
      </div>
      {showReplyForm && (
        <div className="reply-form-inline">
          <input
            placeholder={`Trả lời @${commenter}`}
            value={replyText}
            onChange={(e) => onReplyChange(e.target.value)}
            autoFocus
          />
          <div className="reply-form-actions">
            <button type="button" className="btn-icon cancel" onClick={onCancelReply}>
              <span className="material-symbols-outlined">close</span>
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={onSubmitReply}
              disabled={!replyText.trim()}
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
      )}
      {node.children?.length > 0 && (
        <div className="comment-children">
          {node.children.map(child => (
            <CommentNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onReply={onReply}
              activeReplyId={activeReplyId}
              replyText={replyText}
              onReplyChange={onReplyChange}
              onSubmitReply={onSubmitReply}
              onCancelReply={onCancelReply}
              currentUser={currentUser}
              onDelete={onDelete}
              owner={owner}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PostDetailView = ({ koiId: propKoiId, currentUser, onClose }) => {
  const { id } = useParams();
  const koiId = propKoiId || id;
  const [koi, setKoi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localLikes, setLocalLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [activeReply, setActiveReply] = useState(null);
  const toast = useToast();
  const commentsEndRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/items/${koiId}`) // Đổi sang /items để lấy chi tiết bất kể loại
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setKoi(data);
        setLocalLikes(data.likes || []);
        setComments(data.comments || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [koiId]);

  const handleLike = () => {
    if (!currentUser) return alert("Vui lòng đăng nhập!");
    const isLiked = localLikes.includes(currentUser.email);
    const newLikes = isLiked ? localLikes.filter(e => e !== currentUser.email) : [...localLikes, currentUser.email];
    setLocalLikes(newLikes);

    fetch(`${API_URL}/items/${koiId}/like`, { // Đổi sang /items
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.email })
    })
    .then(res => res.json())
    .then(data => setLocalLikes(data.likes));
  };

  const submitComment = (text, parentId = null) => {
    if (!currentUser) return Promise.reject(new Error('Vui lòng đăng nhập!'));
    if (!text.trim()) return Promise.reject(new Error('Nội dung trống'));

    return fetch(`${API_URL}/items/${koiId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.email, text: text.trim(), parentId })
    })
    .then(res => {
      if (!res.ok) throw new Error('Không thể lưu bình luận');
      return res.json();
    })
    .then(data => {
      setComments(data.comments);
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
      return data;
    });
  };

  const handlePostComment = (e) => {
    e.preventDefault();
    submitComment(commentText)
      .then(() => {
        setCommentText('');
      })
      .catch(err => toast(err.message, 'error'));
  };

  const handleReplySubmit = () => {
    if (!activeReply) return;
    submitComment(replyText, activeReply.id)
      .then(() => {
        setReplyText('');
        setActiveReply(null);
      })
      .catch(err => toast(err.message, 'error'));
  };

  const handleReplyCancel = () => {
    setActiveReply(null);
    setReplyText('');
  };

  const handleDeleteComment = (commentId) => {
    if (!window.confirm('Xóa bình luận này?')) return;
    fetch(`${API_URL}/items/${koiId}/comments/${commentId}?userId=${encodeURIComponent(currentUser.email)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(res => {
      if (!res.ok) throw new Error('Không thể xóa');
      return res.json();
    })
    .then(data => {
      setComments(data.comments);
      toast('Đã xóa bình luận', 'success');
    })
    .catch(err => toast(err.message, 'error'));
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${koiId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast('Đã sao chép liên kết!', 'success');
    }).catch(() => {
      toast('Không thể sao chép liên kết.', 'error');
    });
  };

  if (loading) return <div className="feed-loading">Đang tải...</div>;
  if (!koi) return <div className="feed-loading">Bài viết không tồn tại.</div>;

  const isLiked = currentUser && localLikes.includes(currentUser.email);
  const isKoiIdentity = koi.type === 'koi_identity' || koi.id.startsWith('KOI-');
  const sortedComments = useMemo(() => buildCommentTree(comments), [comments]);

  return (
    <div className="post-detail-container">
      <div className="post-detail-media">
        {koi.images && koi.images.length > 0 ? (
          <div style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', width: '100%', height: '100%' }}>
            {koi.images.map((img, idx) => (
              <div key={idx} style={{ flex: '0 0 100%', scrollSnapAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {img.match(/\.(mp4|webm|ogg|mov|qt|avi|wmv|flv|m4v)$/i) ? (
                  <video src={getImageUrl(img)} controls style={{ maxWidth: '100%', maxHeight: '100%' }} />
                ) : (
                  <img src={getImageUrl(img)} alt={`${koi.name}-${idx}`} onDoubleClick={handleLike} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <img src={getImageUrl(koi.img)} alt={koi.name} onDoubleClick={handleLike} />
        )}
      </div>
      <div className="post-detail-sidebar">
        <div className="post-detail-header">
          <div className="feed-avatar">
            <img src={`https://ui-avatars.com/api/?name=${koi.owner}&background=random&color=fff`} alt={koi.owner} />
          </div>
          <div style={{ fontWeight: 600 }}>{koi.owner?.split('@')[0]}</div>
          <button className="feed-card-more" style={{marginLeft: 'auto'}}><span className="material-symbols-outlined">more_horiz</span></button>
        </div>
        <div className="post-detail-comments-container">
          <div className="post-detail-comment-card">
            <div className="comment-card-header">
              <div className="feed-avatar" style={{flexShrink: 0}}>
                <img src={`https://ui-avatars.com/api/?name=${koi.owner}&background=random&color=fff`} alt={koi.owner} />
              </div>
              <div>
                <strong>{koi.owner?.split('@')[0]}</strong>
                <div className="comment-card-meta">
                  <p className="comment-text">{koi.description || (isKoiIdentity ? `Cá Koi ${koi.variety} tuyệt đẹp.` : '')}</p>
                  <div className="post-detail-comment-time">{getRelativeTime(koi.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="comment-thread">
            {sortedComments.length === 0 ? (
              <p className="empty-comments">Hãy là người đầu tiên phản hồi.</p>
            ) : (
              sortedComments.map(node => (
                <CommentNode
                  key={node.id}
                  node={node}
                  depth={0}
                  onReply={(comment) => {
                    setActiveReply(comment);
                    setReplyText('');
                  }}
                  activeReplyId={activeReply?.id}
                  replyText={replyText}
                  onReplyChange={setReplyText}
                  onSubmitReply={handleReplySubmit}
                  onCancelReply={handleReplyCancel}
                  currentUser={currentUser}
                  onDelete={handleDeleteComment}
                  owner={koi.owner}
                />
              ))
            )}
            <div ref={commentsEndRef} />
          </div>
        </div>

        <div className="post-detail-actions">
          <div className="feed-card-actions-left">
            <button onClick={handleLike} className={`icon-button ${isLiked ? 'active' : ''}`} type="button">
              <span className="material-icons-outlined">{isLiked ? 'favorite' : 'favorite_border'}</span>
            </button>
            <button onClick={() => document.getElementById('comment-input-detail')?.focus()} className="icon-button" type="button">
              <span className="material-icons-outlined">mode_comment</span>
            </button>
            <button onClick={handleCopyLink} className="icon-button" type="button">
              <span className="material-icons-outlined">link</span>
            </button>
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', padding: '0 8px' }}>{localLikes.length || 0} lượt thích</div>
        </div>

        {!activeReply && (
          <div className="post-detail-add-comment">
            <form onSubmit={handlePostComment}>
              <input
                id="comment-input-detail"
                placeholder="Thêm bình luận..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="btn-icon" disabled={!commentText.trim()}>
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetailView;
