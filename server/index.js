const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { registerV2Routes } = require('./v2/routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit per file
});
app.use('/uploads', express.static(uploadsDir));

// --- CẤU HÌNH ĐƯỜNG DẪN DỮ LIỆU (DATA PATHS) ---
const DATA_FILE = path.join(__dirname, 'data.json');
const NOTIFICATIONS_FILE = path.join(__dirname, 'notifications.json');
const TRANSACTIONS_FILE = path.join(__dirname, 'transactions.json');
const USERS_FILE = path.join(__dirname, 'users.json'); // Thêm file quản lý User
const POSTS_FILE = path.join(__dirname, 'posts.json'); // File riêng cho bài viết

const ensureJsonFile = (filePath, defaultValue) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
  }
};

ensureJsonFile(DATA_FILE, []);
ensureJsonFile(NOTIFICATIONS_FILE, []);
ensureJsonFile(TRANSACTIONS_FILE, []);
ensureJsonFile(USERS_FILE, []);
ensureJsonFile(POSTS_FILE, []);

// --- LỚP DỮ LIỆU (DATA LAYER HELPERS) ---

const readData = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
};

const readNotifications = () => {
  try {
    const data = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const writeNotifications = (data) => {
  fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
};

const readTransactions = () => {
  try {
    const data = fs.readFileSync(TRANSACTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const writeTransactions = (data) => {
  fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
};

const readUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const writeUsers = (data) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
};

const readPosts = () => {
  try {
    const data = fs.readFileSync(POSTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const writePosts = (data) => {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(data, null, 2), 'utf8');
};

// ============================================================
// PHÂN HỆ V2: DATA MODEL CHUẨN HÓA (ACCOUNT/COLLECTION/KOI TRACE)
// ============================================================
registerV2Routes({
  app,
  readLegacyUsers: readUsers,
  readLegacyKois: readData,
});

// ============================================================
// PHÂN HỆ 1: NGƯỜI DÙNG & HỆ THỐNG (USER & SYSTEM MODULE)
// ============================================================

// Đồng bộ thông tin User từ Firebase về Database nội bộ
app.post('/api/users/sync', (req, res) => {
  const { uid, email, displayName, photoURL } = req.body;
  const users = readUsers();
  const existingUserIndex = users.findIndex(u => u.email === email);
  const existingUser = existingUserIndex > -1 ? users[existingUserIndex] : {};

  const userData = {
    uid,
    email,
    displayName: displayName || 'Weme Member',
    photoURL: photoURL || '',
    role: email === 'doantanvu2410@gmail.com' ? 'admin' : 'user', // Tự động set Admin
    lastLogin: new Date().toISOString(),
    followers: existingUser.followers || [],
    following: existingUser.following || [],
    bio: existingUser.bio || ''
  };

  if (existingUserIndex > -1) {
    users[existingUserIndex] = { ...users[existingUserIndex], ...userData };
  } else {
    users.push({ ...userData, createdAt: new Date().toISOString() });
  }
  
  writeUsers(users);
  res.json({ success: true, user: userData });
});

// Lấy thông tin User (Public Profile)
app.get('/api/users/:email', (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.email === req.params.email);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({
    followers: [],
    following: [],
    bio: '',
    ...user
  });
});

// Lấy danh sách tất cả Users (Admin)
app.get('/api/users', (req, res) => {
  const users = readUsers();
  res.json(users);
});

// Lấy danh sách User theo danh sách Email (Batch)
app.post('/api/users/batch', (req, res) => {
  const { emails } = req.body;
  if (!Array.isArray(emails)) return res.json([]);
  
  const users = readUsers();
  const result = users
    .filter(u => emails.includes(u.email))
    .map(u => ({
      email: u.email,
      displayName: u.displayName,
      photoURL: u.photoURL,
      following: u.following || []
    }));
  res.json(result);
});

// Cập nhật thông tin User (Bio, Name)
app.put('/api/users/:email', (req, res) => {
  const users = readUsers();
  const index = users.findIndex(u => u.email === req.params.email);
  if (index === -1) return res.status(404).json({ message: 'User not found' });

  users[index] = { ...users[index], ...req.body };
  writeUsers(users);
  res.json(users[index]);
});

// Follow user
app.post('/api/users/:email/follow', (req, res) => {
  const { followerEmail } = req.body;
  const targetEmail = req.params.email;

  if (!followerEmail || !targetEmail) return res.status(400).json({ message: 'Missing emails' });
  
  const users = readUsers();
  const followerIndex = users.findIndex(u => u.email === followerEmail);
  const targetIndex = users.findIndex(u => u.email === targetEmail);

  if (followerIndex === -1 || targetIndex === -1) return res.status(404).json({ message: 'User not found' });

  const follower = users[followerIndex];
  const target = users[targetIndex];

  if (!follower.following) follower.following = [];
  if (!target.followers) target.followers = [];

  if (!follower.following.includes(targetEmail)) {
    follower.following.push(targetEmail);
  }
  if (!target.followers.includes(followerEmail)) {
    target.followers.push(followerEmail);
  }

  // Notification
  const notifications = readNotifications();
  notifications.push({
    id: Date.now().toString(),
    type: 'follow',
    actorId: followerEmail,
    recipientId: targetEmail,
    text: 'đã bắt đầu theo dõi bạn.',
    createdAt: new Date().toISOString()
  });
  writeNotifications(notifications);

  writeUsers(users);
  res.json({ success: true, followers: target.followers });
});

// Unfollow user
app.post('/api/users/:email/unfollow', (req, res) => {
  const { followerEmail } = req.body;
  const targetEmail = req.params.email;

  const users = readUsers();
  const followerIndex = users.findIndex(u => u.email === followerEmail);
  const targetIndex = users.findIndex(u => u.email === targetEmail);

  if (followerIndex === -1 || targetIndex === -1) return res.status(404).json({ message: 'User not found' });

  const follower = users[followerIndex];
  const target = users[targetIndex];

  if (follower.following) {
    follower.following = follower.following.filter(e => e !== targetEmail);
  }
  if (target.followers) {
    target.followers = target.followers.filter(e => e !== followerEmail);
  }

  writeUsers(users);
  res.json({ success: true, followers: target.followers || [] });
});

// ============================================================
// PHÂN HỆ 2: CÁ KOI & BẢNG TIN (KOI IDENTITY & NEWSFEED)
// ============================================================

// Lấy danh sách Cá Koi (Chỉ Koi)
app.get('/api/kois', (req, res) => {
  const kois = readData();
  res.json(kois);
});

// Lấy chi tiết Cá Koi theo ID
app.get('/api/kois/:id', (req, res) => {
  const kois = readData();
  const koi = kois.find(k => k.id === req.params.id);
  if (!koi) return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });
  res.json(koi);
});

// Lấy danh sách tổng hợp (Feed) cho trang chủ
app.get('/api/feed', (req, res) => {
  const kois = readData();
  const posts = readPosts();
  // Gộp và sắp xếp theo thời gian mới nhất
  const feed = [...kois, ...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(feed);
});

// --- TÁCH BIỆT CHỨC NĂNG ĐĂNG BÀI VÀ ĐĂNG KÝ ĐỊNH DANH ---

const postUpload = upload.array('imgUpload', 6);

// 1. API Đăng bài viết (Social Post)
// Lưu vào posts.json
// - Chỉ upload 1 ảnh
// - Trạng thái mặc định: Approved
// - ID: POST-...
app.post('/api/posts', (req, res) => {
  postUpload(req, res, (err) => {
    if (err) {
      console.error('Upload Error:', err);
      return res.status(400).json({ message: 'Lỗi upload ảnh: ' + err.message });
    }

    const posts = readPosts();
    const newPost = {
      ...req.body,
      id: `POST-${Date.now()}`,
      type: 'post',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: [],
      comments: [],
      status: 'approved',
      owner: req.body.owner || 'anonymous',
      images: []
    };

    const validFiles = (req.files || []).filter(f => f.fieldname === 'imgUpload');
    if (validFiles.length > 0) {
      newPost.images = validFiles.map(f => `/uploads/${f.filename}`);
      newPost.img = newPost.images[0];
    }

    posts.push(newPost);
    writePosts(posts);
    res.status(201).json(newPost);
  });
});

// Lấy danh sách bài viết
app.get('/api/posts', (req, res) => {
  const posts = readPosts();
  res.json(posts);
});

// Cập nhật bài viết (caption, tags, ảnh nếu cần)
app.put('/api/posts/:id', upload.array('imgUpload', 6), (req, res) => {
  const posts = readPosts();
  const index = posts.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Post not found' });

  const updated = { ...posts[index], ...req.body };
  if (req.files && req.files.length > 0) {
    updated.images = req.files.map(f => `/uploads/${f.filename}`);
    updated.img = updated.images[0];
  }
  updated.updatedAt = new Date().toISOString();

  posts[index] = updated;
  writePosts(posts);
  res.json(updated);
});

// Xóa bài viết
app.delete('/api/posts/:id', (req, res) => {
  const posts = readPosts();
  const newPosts = posts.filter(p => p.id !== req.params.id);
  if (posts.length === newPosts.length) return res.status(404).json({ message: 'Post not found' });
  writePosts(newPosts);
  res.json({ success: true });
});

// 2. API Đăng ký định danh (Koi Identity)
// Lưu vào data.json
// - Upload ảnh cá + giấy chứng nhận
// - Trạng thái mặc định: Pending (Chờ duyệt)
// - ID: KOI-...
app.post('/api/kois', upload.fields([{ name: 'imgUpload', maxCount: 4 }, { name: 'certificate', maxCount: 1 }]), (req, res) => {
  const kois = readData();
  const newKoi = { ...req.body };

  if (req.files) {
    if (req.files.imgUpload && req.files.imgUpload.length > 0) {
      newKoi.img = `/uploads/${req.files.imgUpload[0].filename}`; // Ảnh đại diện (ảnh đầu tiên)
      newKoi.images = req.files.imgUpload.map(f => `/uploads/${f.filename}`); // Danh sách tất cả ảnh
    }
    if (req.files.certificate) newKoi.certificate_img = `/uploads/${req.files.certificate[0].filename}`;
  }
  
  // Convert số liệu
  if (newKoi.size) newKoi.size = Number(newKoi.size);
  if (newKoi.year) newKoi.year = Number(newKoi.year);
  if (newKoi.kg) newKoi.kg = Number(newKoi.kg);

  newKoi.id = `KOI-${Date.now()}`;
  newKoi.type = 'koi_identity';
  newKoi.verified = false;
  newKoi.status = 'pending'; // Hồ sơ định danh cần duyệt
  newKoi.owner = newKoi.owner || 'anonymous';
  newKoi.createdAt = newKoi.createdAt || new Date().toISOString();
  newKoi.updatedAt = new Date().toISOString();
  newKoi.likes = [];
  newKoi.comments = [];

  kois.push(newKoi);
  writeData(kois);

  res.status(201).json(newKoi);
});

// Cập nhật thông tin hồ sơ (Dành cho Owner hoặc Admin)
app.put('/api/kois/:id', upload.single('imgUpload'), (req, res) => {
  const kois = readData();
  const index = kois.findIndex(k => k.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });

  const updatedKoi = { ...kois[index], ...req.body };
  if (req.file) {
    updatedKoi.img = `/uploads/${req.file.filename}`;
  }
  updatedKoi.updatedAt = new Date().toISOString();
  
  kois[index] = updatedKoi;
  writeData(kois);
  res.json(updatedKoi);
});

// Xóa hồ sơ (Admin hoặc Owner)
app.delete('/api/kois/:id', (req, res) => {
  const kois = readData();
  const newKois = kois.filter(k => k.id !== req.params.id);
  if (kois.length === newKois.length) return res.status(404).json({ message: 'Không tìm thấy để xóa' });
  
  writeData(newKois);
  res.json({ success: true });
});

// ============================================================
// PHÂN HỆ 3: TƯƠNG TÁC XÃ HỘI (INTERACTION ENGINE)
// ============================================================

// Helper tìm item trong cả 2 nguồn
const findItem = (id) => {
  const kois = readData();
  const posts = readPosts();
  let item = kois.find(k => k.id === id);
  if (item) return { item, type: 'koi', list: kois };
  item = posts.find(p => p.id === id);
  if (item) return { item, type: 'post', list: posts };
  return null;
};

// Thả tim (Like/Unlike) - Xử lý chung cho cả Koi và Post
app.post('/api/items/:id/like', (req, res) => {
  const { userId } = req.body;
  const result = findItem(req.params.id);
  if (!result) return res.status(404).json({ message: 'Item not found' });
  const { item: koi, type, list } = result;

  if (!koi.likes) koi.likes = [];

  const index = koi.likes.indexOf(userId);
  if (index === -1) {
    koi.likes.push(userId); // Like
    
    // Tạo thông báo nếu người like không phải chủ bài viết
    if (koi.owner !== userId) {
      const notifications = readNotifications();
      notifications.push({
        id: Date.now().toString(),
        type: 'like',
        actorId: userId,
        recipientId: koi.owner,
        koiId: koi.id,
        createdAt: new Date().toISOString()
      });
      writeNotifications(notifications);
    }
  } else {
    koi.likes.splice(index, 1); // Unlike
  }

  if (type === 'koi') writeData(list);
  else writePosts(list);

  res.json({ likes: koi.likes });
});

// Lưu bài viết (Bookmark) - Xử lý chung
app.post('/api/items/:id/bookmark', (req, res) => {
  const { userId } = req.body;
  const result = findItem(req.params.id);
  if (!result) return res.status(404).json({ message: 'Item not found' });
  const { item: koi, type, list } = result;

  if (!koi.bookmarks) koi.bookmarks = [];

  const index = koi.bookmarks.indexOf(userId);
  if (index === -1) {
    koi.bookmarks.push(userId); // Bookmark
  } else {
    koi.bookmarks.splice(index, 1); // Remove bookmark
  }

  if (type === 'koi') writeData(list);
  else writePosts(list);

  res.json({ bookmarks: koi.bookmarks });
});

// Bình luận (Comment) - Xử lý chung
app.post('/api/items/:id/comment', (req, res) => {
  const { userId, text, parentId } = req.body;
  const result = findItem(req.params.id);
  if (!result) return res.status(404).json({ message: 'Item not found' });
  const { item: koi, type, list } = result;

  if (!koi.comments) koi.comments = [];

  const newComment = { 
    id: `cmt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId, 
    text, 
    parentId: parentId || null,
    likes: [],
    createdAt: new Date().toISOString() 
  };
  koi.comments.push(newComment);

  // Tạo thông báo nếu người comment không phải chủ bài viết
  if (koi.owner !== userId) {
    const notifications = readNotifications();
    notifications.push({
      id: Date.now().toString(),
      type: 'comment',
      actorId: userId,
      recipientId: koi.owner,
      koiId: koi.id,
      text: text,
      createdAt: new Date().toISOString()
    });
    writeNotifications(notifications);
  }

  if (type === 'koi') writeData(list);
  else writePosts(list);

  res.json({ comments: koi.comments });
});

// Sửa bình luận (Edit Comment)
app.put('/api/items/:itemId/comments/:commentId', (req, res) => {
  const { userId, text } = req.body;
  const { itemId, commentId } = req.params;
  
  const result = findItem(itemId);
  if (!result) return res.status(404).json({ message: 'Item not found' });
  const { item, type, list } = result;

  if (!item.comments) return res.status(404).json({ message: 'Comment not found' });

  const comment = item.comments.find(c => c.id === commentId);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });
  if (comment.userId !== userId) return res.status(403).json({ message: 'Unauthorized' });

  comment.text = text;
  comment.updatedAt = new Date().toISOString(); // Cập nhật thời gian sửa nếu cần

  if (type === 'koi') writeData(list);
  else writePosts(list);

  res.json({ comments: item.comments });
});

// Xóa bình luận (Delete Comment)
app.delete('/api/items/:itemId/comments/:commentId', (req, res) => {
  const userId = req.body.userId || req.query.userId;
  if (!userId) return res.status(400).json({ message: 'Thiếu thông tin người dùng (userId)' });
  const { itemId, commentId } = req.params;

  const result = findItem(itemId);
  if (!result) return res.status(404).json({ message: 'Item not found' });
  const { item, type, list } = result;

  if (!item.comments) return res.status(404).json({ message: 'Comment not found' });

  const commentIndex = item.comments.findIndex(c => c.id === commentId);
  if (commentIndex === -1) return res.status(404).json({ message: 'Comment not found' });
  
  const commentToDelete = item.comments[commentIndex];
  const isCommentOwner = commentToDelete.userId === userId;
  const isPostOwner = item.owner === userId;

  // Cho phép xóa nếu là chủ bình luận HOẶC chủ bài viết
  if (!isCommentOwner && !isPostOwner) {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  item.comments.splice(commentIndex, 1); // Xóa bình luận

  if (type === 'koi') writeData(list);
  else writePosts(list);

  res.json({ comments: item.comments });
});

// Thả tim bình luận (Like Comment)
app.post('/api/items/:itemId/comments/:commentId/like', (req, res) => {
  const { userId } = req.body;
  const { itemId, commentId } = req.params;

  const result = findItem(itemId);
  if (!result) return res.status(404).json({ message: 'Item not found' });
  const { item, type, list } = result;

  if (!item.comments) return res.status(404).json({ message: 'Comment not found' });

  const comment = item.comments.find(c => c.id === commentId);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });

  if (!comment.likes) comment.likes = [];

  const index = comment.likes.indexOf(userId);
  if (index === -1) {
    comment.likes.push(userId); // Like
  } else {
    comment.likes.splice(index, 1); // Unlike
  }

  if (type === 'koi') writeData(list);
  else writePosts(list);

  res.json({ likes: comment.likes });
});

// Lấy chi tiết Item (Koi hoặc Post)
app.get('/api/items/:id', (req, res) => {
  const result = findItem(req.params.id);
  if (!result) return res.status(404).json({ message: 'Item not found' });
  res.json(result.item);
});

// ============================================================
// PHÂN HỆ 4: MEDIA & THÔNG BÁO (MEDIA & NOTIFICATION)
// ============================================================

// Upload Avatar riêng biệt
app.post('/api/avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không tìm thấy ảnh avatar.' });
  }

  const avatarUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({ avatarUrl });
});

// Lấy danh sách thông báo
app.get('/api/notifications', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.json([]);
  const notifications = readNotifications();
  // Lọc thông báo của user và sắp xếp mới nhất lên đầu
  res.json(notifications.filter(n => n.recipientId === userId).reverse());
});

// ============================================================
// PHÂN HỆ 5: CHUYỂN NHƯỢNG SỐ (DIGITAL HANDSHAKE PROTOCOL)
// ============================================================

// Bước 1: Khởi tạo giao dịch (Initiate Transfer)
app.post('/api/transactions/initiate', (req, res) => {
  const { koiId, sellerId, buyerEmail } = req.body;
  if (!koiId || !sellerId || !buyerEmail) return res.status(400).json({ message: 'Thiếu thông tin' });

  const kois = readData();
  const koi = kois.find(k => k.id === koiId);
  
  if (!koi) return res.status(404).json({ message: 'Không tìm thấy cá' });
  if (koi.owner !== sellerId) return res.status(403).json({ message: 'Bạn không phải chủ sở hữu' });
  if (koi.status === 'transferring') return res.status(400).json({ message: 'Cá đang trong quá trình chuyển nhượng' });

  const transactions = readTransactions();
  const newTx = {
    id: `TX-${Date.now()}`,
    koiId,
    sellerId,
    buyerEmail,
    status: 'pending_acceptance',
    createdAt: new Date().toISOString()
  };

  transactions.push(newTx);
  writeTransactions(transactions);

  // Lock Koi
  koi.status = 'transferring';
  writeData(kois);

  // Notify Buyer
  const notifications = readNotifications();
  notifications.push({
    id: Date.now().toString(),
    type: 'transfer_request',
    actorId: sellerId,
    recipientId: buyerEmail, // Giả sử email là ID người dùng cho đơn giản
    koiId: koiId,
    text: `muốn chuyển nhượng cá ${koi.name} cho bạn.`,
    createdAt: new Date().toISOString()
  });
  writeNotifications(notifications);

  res.status(201).json(newTx);
});

// Bước 2: Phản hồi giao dịch (Accept/Reject/Cancel)
app.post('/api/transactions/respond', (req, res) => {
  const { transactionId, userId, action } = req.body; // action: 'accept' | 'reject' | 'cancel'
  
  const transactions = readTransactions();
  const txIndex = transactions.findIndex(t => t.id === transactionId);
  if (txIndex === -1) return res.status(404).json({ message: 'Giao dịch không tồn tại' });
  
  const tx = transactions[txIndex];
  const kois = readData();
  const koi = kois.find(k => k.id === tx.koiId);

  if (!koi) return res.status(404).json({ message: 'Cá không tồn tại' });

  if (action === 'accept') {
    if (userId !== tx.buyerEmail) return res.status(403).json({ message: 'Bạn không có quyền nhận' });
    
    // Atomic Update
    tx.status = 'completed';
    tx.completedAt = new Date().toISOString();
    
    if (!koi.history) koi.history = [];
    koi.history.push({
      owner: tx.sellerId,
      date: new Date().toISOString(),
      type: 'transfer_out'
    });
    
    koi.owner = tx.buyerEmail;
    koi.status = 'verified'; // Unlock
    
  } else if (action === 'reject' || action === 'cancel') {
    // Check permission: Buyer can reject, Seller can cancel
    if (action === 'reject' && userId !== tx.buyerEmail) return res.status(403).json({ message: 'Không có quyền từ chối' });
    if (action === 'cancel' && userId !== tx.sellerId) return res.status(403).json({ message: 'Không có quyền hủy' });

    tx.status = 'cancelled';
    koi.status = 'verified'; // Unlock back to original owner
  }

  writeTransactions(transactions);
  writeData(kois);
  
  res.json({ success: true, koiStatus: koi.status });
});

// Lấy danh sách giao dịch theo user (buyer/seller) hoặc theo trạng thái
app.get('/api/transactions', (req, res) => {
  const { userId, status } = req.query;
  let transactions = readTransactions();
  if (userId) {
    transactions = transactions.filter(t => t.sellerId === userId || t.buyerEmail === userId);
  }
  if (status) {
    transactions = transactions.filter(t => t.status === status);
  }
  const kois = readData();
  const enriched = transactions.map(tx => {
    const koi = kois.find(k => k.id === tx.koiId);
    return {
      ...tx,
      koi: koi
        ? {
            id: koi.id,
            name: koi.name,
            img: koi.img,
            status: koi.status,
            owner: koi.owner,
            variety: koi.variety,
          }
        : null
    };
  });
  enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(enriched);
});

// Tổng quan Admin
app.get('/api/admin/summary', (req, res) => {
  const kois = readData();
  const posts = readPosts();
  const users = readUsers();
  const transactions = readTransactions();
  const notifications = readNotifications();

  const stats = {
    kois: {
      total: kois.length,
      pending: kois.filter(k => k.status === 'pending').length,
      verified: kois.filter(k => k.status === 'verified').length,
      rejected: kois.filter(k => k.status === 'rejected').length,
    },
    posts: {
      total: posts.length,
    },
    users: {
      total: users.length,
    },
    transactions: {
      total: transactions.length,
      pending: transactions.filter(t => t.status === 'pending_acceptance').length,
      completed: transactions.filter(t => t.status === 'completed').length,
      cancelled: transactions.filter(t => t.status === 'cancelled').length,
    },
    notifications: {
      total: notifications.length,
    }
  };

  res.json(stats);
});

// Kiểm tra trạng thái giao dịch của một con cá (Chỉ dành cho Koi)
app.get('/api/kois/:id/transaction', (req, res) => {
  const transactions = readTransactions();
  // Tìm giao dịch pending mới nhất cho cá này
  const tx = transactions.find(t => t.koiId === req.params.id && t.status === 'pending_acceptance');
  res.json(tx || null);
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Wemepet API is running 🚀'
  });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server chạy ngon lành tại http://localhost:${PORT}`);
  console.log(`📂 Dữ liệu sẽ lưu tại: ${DATA_FILE}`);
});
