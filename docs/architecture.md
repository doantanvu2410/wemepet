# MÔ TẢ KỸ THUẬT & KIẾN TRÚC HỆ THỐNG - WEMEPET

**Phiên bản:** 2.1 (Ecosystem Deep Dive)
**Mục tiêu:** Phân tích kỹ thuật chi tiết cho 8 phân hệ cốt lõi và 5 phân hệ hệ sinh thái nâng cao.

## 1. QUẢN LÝ TÀI KHOẢN & XÁC THỰC (AUTHENTICATION MODULE)
- **Dịch vụ lõi:** Firebase Authentication chịu trách nhiệm xác thực; `client/src/firebaseConfig.js` chỉ expose `auth` và `provider`.
- **Luồng đăng ký/đăng nhập:** hỗ trợ Email/Password và Google Provider thông qua `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `signInWithPopup`. Khi user mới tạo tài khoản, một trigger (Cloud Function) bên backend phải khởi tạo document bổ sung trong collection `users` chứa thông tin (Họ tên, Ngày sinh, Giới tính, Role: `user`).
- **State khi mở app:** `App.jsx` lắng nghe `onAuthStateChanged` để thay đổi `user`, bật/tắt popup, và đảm bảo session luôn cập nhật nhờ token được refresh tự động.
- **Profile view:** `ProfilePage.jsx` lấy thông tin từ `user` hiện tại hoặc `localStorage` (MOCK_USER fallback). Mọi cập nhật (avatar, display name, bio) dùng Optimistic UI, cập nhật giao diện ngay khi người dùng thao tác trong khi vẫn gọi `updateProfile` tạo request lên Firebase.
- **Follow system:** Mối quan hệ N-N được thiết lập qua các sub-collection `followers`/`following` (được quản lý phía server), cho phép xử lý follow/unfollow mà không làm tràn document chính; backend mock (server/index.js) cung cấp `POST /api/users/:identifier/follow` và `/unfollow` để cập nhật các bảng followers/following lưu trong `users.json`.
- **Trigger backend tạo user:** Để mô phỏng Cloud Function, backend expose `POST /api/users` (thực hiện bởi trigger Firebase) để thêm document user với thông tin cơ bản (uid, tên, giới tính, subscriptionTier) và các mảng followers/following/ngân sách XP ban đầu.

## 2. BẢNG TIN & TƯƠNG TÁC (NEWSFEED ENGINE)
- **Query strategy:** `GalleryPage.jsx`/`ExplorePage.jsx` fetch bài viết từ `posts` với filter `where('status','==','approved')`, `orderBy('createdAt','desc')`.
- **Hiển thị thời gian:** Dùng thư viện như `dayjs` hoặc `date-fns` để tính `timeAgo` trên giao diện (hiển thị kiểu “2 giờ trước”).
- **PostItem:** ảnh chỉ tải khi người dùng cuộn đến (Intersection Observer) và card có lazy loading.
- **Tương tác Like/Bookmark:** Lưu ID người tương tác vào mảng `likes`/`bookmarks` của document; apply debounce trước khi gọi API để tránh spam.

## 3. ĐĂNG TẢI NỘI DUNG (CONTENT CREATION)
- **Pipeline upload:** ảnh/video upload lên Firebase Storage và nén client-side bằng Canvas API trước khi gửi. Sử dụng `SubmitKoiPopup.jsx`/`TransferKoiPopup.jsx` làm điểm tương tác.
- **Bộ lọc preview:** Áp dụng CSS filters (grayscale, sepia, contrast) trực tiếp lên `<img>` để preview; xử lý thật trên backend khi bấm đăng.
- **Tagging:** hỗ trợ tag user qua `@handle` (tìm kiếm trong `users` collection) và tag identity với dropdown hiển thị `myIdentities` (chỉ identity verified) của user.
- **Phân biệt nội dung:** mục “Tạo bài viết” chỉ dùng để chia sẻ ảnh/video, không tạo hồ sơ định danh koi; việc tạo hồ sơ chỉ xảy ra trong “Đăng ký định danh cá” (CreateModal ở chế độ Identity), đảm bảo bảng tin và hệ thống profile không bị trộn lẫn.

## 4. ĐỊNH DANH CÁ KOI (IDENTITY REGISTRATION CORE)
- **Form create modal:** chế độ “Identity” (component `RegisterKoiPopup.jsx`) chứa validation chặt chẽ cho các trường số (Size, Năm sinh, Cân nặng) trước khi call API.
- **Schema:** mỗi identity document chứa `{ variety, breeder, certificateUrl, status: 'pending', currentStats: { size, weight }, ownerId }` và metadata khác.
- **State machine:** hồ sơ mới được “cách ly” (status `pending`); chỉ chủ sở hữu nhìn thấy với badge vàng “Pending”, và Feed/Nor/Explore không thể quét tới khi status được verified.

## 5. KHÁM PHÁ (EXPLORE MODULE)
- **Layout:** CSS Grid (`grid-cols-3`), responsive giảm còn 2 hay 1 cột trên mobile (kết hợp class Tailwind như `md:grid-cols-3`).
- **Skeleton:** khi fetch data, hiển thị khối xám (`animate-pulse`) để tránh layout shift.

## 6. THÔNG BÁO (NOTIFICATION SYSTEM)
- **Realtime sync:** sử dụng `onSnapshot` trên sub-collection `notifications` của user để đẩy dữ liệu mới ngay lập tức.
- **Gom nhóm:** nếu nhiều người tương tác, hiển thị chuỗi “A, B và 8 người khác đã thích bài viết của bạn”.

## 7. QUẢN TRỊ (ADMIN DASHBOARD)
- **Route guard:** chuyển hướng nếu `user` không có claim `isAdmin`; logic guard nằm trong `AdminPage.jsx` và được gọi từ `App.jsx`.
- **Duyệt hồ sơ:** truy vấn `collection('identities')` với `where('status','==','pending')`, hiển thị queue.
- **Handlers:** approve -> `updateDoc` status `verified` + `verifiedAt`; reject -> collect lý do, gửi notification, cập nhật status `rejected` và `reason`; batch delete bằng Firestore Batch Write cho multi selection.
- **Queue backend:** `GET /api/verification/queue` lấy danh sách hồ sơ pending (server/index.js) và các action `POST /api/verification/queue/:id/approve` hoặc `/reject` cập nhật status + thông báo cho owner.

## 8. GIAO DIỆN & TRẢI NGHIỆM (UI/UX ARCHITECTURE)
- **Responsive strategy:** Desktop (>1024px) dùng `Sidebar` cố định, Mobile render `BottomTabNavigator` (kết hợp `hidden md:flex` và `md:hidden`).
- **Visual design:** Font Inter, biểu tượng Material Symbols (qua `components/Popups.jsx`).
- **Context separation:** Social View (gallery/ feed) sử dụng không gian trắng, layout tràn ảnh; Identity View (profile) dùng card/bảng với labels rõ ràng (size, dòng, trại).

## 9. HỆ SINH THÁI CHUYÊN SÂU (ADVANCED ECOSYSTEM FEATURES)

### 9.1 Chuyển nhượng số (Digital Handshake Protocol)
- Schema transactions: `{ transactionId, koiId, sellerId, buyerEmail, status, createdAt, expiresAt }`.
- Atomic swap: Firestore Transaction gồm update `koi.ownerId`, đẩy `oldOwnerId` vào `ownershipHistory`, update `transaction.status`, mở khóa `koi.status`.
- Giao dịch steps: Initiate (set koi.status = `transferring`), Accept (thực thi transaction và chuyển Owner), Verify (status = `verified`).

### 9.2 Hệ thống Gia phả (Lineage Mapping)
- Identity schema mở rộng thêm `sireId` và `damId` tham chiếu tới koiId của cha/mẹ.
- Rendering: component đệ quy vẽ cây gia phả tối đa 3 đời, click vào avatar bố/mẹ chuyển tới trang identity tương ứng.

### 9.3 Hồ sơ Sức khỏe (Health Record System)
- Health logs lưu trong sub-collection `identities/{koiId}/healthLogs` (tránh giới hạn 1MB). Schema log gồm `date`, `type`, `symptoms`, `treatment`, `attachments`.
- UI timeline hiển thị lịch sử bệnh án, giúp owner mới review tiền sử trước khi chuyển nhượng.

### 9.4 Gamification (Hệ thống Cấp bậc)
- Cloud Function trigger `onWrite` (khi user đăng bài hoặc verify koi): cộng XP (`user.stats.xp`).
- Ranking tiers: `Fry (0-100)`, `Tosai (101-500)`, `Nisai (500+ and >=3 verified koi)`, `Grand Champion` (yêu cầu thêm follower count).

### 9.5 Mô hình Kinh doanh (Business Logic Implementation)
- RBAC: mỗi user document có `subscriptionTier` = `free | pro | dealer`.
- Feature gating: Free giới hạn 5 identity, nén ảnh; Pro không giới hạn + upload 4K + chart growth + export PDF; Dealer thêm tab `Marketplace` để niêm yết giá.

## 10. GHI CHÚ TỐI ƯU UI/UX MINIMALIST
- **Typography & Palette:** Cả app dùng duy nhất font `Google Sans Flex`, text giữ màu đen hoặc xám nhẹ, nền chung là `#f7f7f7`, bộ màu đơn sắc giúp các thành phần nổi bật nhờ khoảng trắng.
- **Sidebar cố định:** Sidebar nằm sát trái, nền trong suốt, chỉ giữ icon `pets` làm thương hiệu; khối lệnh `Định danh cá` + `Xem thêm` nằm ở đáy để luôn hiển thị, menu chính căn giữa theo cột, `Xem thêm` bật menu lên trên, chỉ còn `Đăng nhập/Đăng ký` hoặc `Đăng xuất` (đỏ), bỏ mục cài đặt dư thừa.
- **Newsfeed & tương tác:** Card bài viết có overlay nhỏ hiển thị lượt yêu thích/bình luận bằng icon trắng để nổi bật trên ảnh; các hành động like/comment/bookmark dùng icon đen, comment giờ hỗ trợ reply (form hiện ngay dưới comment khi nhấn “Trả lời”, gửi `parentId` về backend, hiển thị replies). Nút chia sẻ chỉ còn text “Sao chép liên kết” (không có icon) cho layout gọn.
- **Consistency:** Avatar luôn tròn và ưu tiên photoURL của user nếu có; các nút, ghi chú, và phần detail duy trì viền nhạt với nền trắng/transparent để giữ tinh thần minimalist.
