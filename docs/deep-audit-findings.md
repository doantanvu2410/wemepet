# Deep Audit Findings (Hiện trạng -> V2)

## A. Lỗi logic / điểm yếu hiện trạng

1. Thiếu thực thể gốc cho mô hình vận hành
- Hiện tại chưa có mô hình `Farm`, `Dealer`, `Collection` chuẩn hóa trong dữ liệu runtime.
- `users.json` chỉ chứa user profile cơ bản, không phân tách vai trò vận hành chuỗi cung ứng.

2. Traceability chưa bền vững
- Mã cá hiện phụ thuộc ngữ cảnh hồ sơ (`KOI-*`) và logic giao dịch cục bộ.
- Chưa có event log chuẩn để truy được toàn bộ hành trình ownership theo thời gian.

3. Dữ liệu chồng chéo và khó mở rộng
- Bài viết xã hội (`posts`) và định danh (`kois`) có nhiều field tương tự nhưng tách logic thủ công.
- Follow/Notification/Transaction/Koi cập nhật rời rạc, không có transaction boundary.

4. Query chưa chuẩn cho dữ liệu lớn
- Danh sách lớn hiện tải full array rồi filter/sort client-side ở nhiều màn.
- Chưa có cursor pagination cho collection / koi profile list.

5. Media payload nặng
- List endpoint trả thẳng full media list trong nhiều luồng, dễ tăng chi phí parse/render khi số lượng lớn.

6. Workflow Collection chưa hoàn chỉnh
- Chưa có luồng chuẩn: Create Collection -> add/remove koi -> auto classify -> growth timeline theo collection context.

## B. Cải tiến đã triển khai trong mã nguồn

1. Module dữ liệu chuẩn hóa V2
- File: `server/v2/service.js`
- Bổ sung model runtime:
  - `Account` (`personal|farm|dealer`)
  - `Collection` + `autoRules`
  - `KoiProfile` + `collectionMemberships (manual|auto)`
  - `GrowthLog`
  - `TraceEvent`

2. Bảo toàn truy xuất nguồn gốc
- Mỗi cá có `koiIdentityId` immutable.
- Transfer ownership tạo event `TRANSFERRED` thay vì ghi đè mất lịch sử.
- API `GET /api/v2/koi-profiles/:id/trace` trả timeline truy xuất.

3. Auto-classification thông minh
- Collection có rules `autoVarieties` và `autoStatuses`.
- Khi tạo/sửa Koi hoặc cập nhật rule collection, hệ thống sync membership tự động.

4. Pagination + payload optimization
- List APIs dùng `cursor` + `limit`.
- `koi-profiles` mặc định trả media summary (thumbnail/counts), giảm tải cho list lớn.

5. Legacy-safe migration
- V2 bootstrap tự động seed từ `users.json` và `data.json` nếu dữ liệu mới rỗng.
- Không phá API cũ.

6. Route tách module
- File: `server/v2/routes.js`
- Đăng ký song song dưới prefix `/api/v2/*`.

## C. Vì sao cấu trúc mới bền vững hơn

1. Domain tách bạch
- Mỗi thực thể có trách nhiệm rõ ràng, giảm coupling giữa social feed và identity lifecycle.

2. Event-sourced traceability tối giản
- Ownership không còn là trạng thái “đè lên nhau” mà là chuỗi sự kiện có thể audit.

3. Khả năng scale theo chiều dữ liệu
- Cursor pagination + media summary giữ API list ổn định khi lên hàng nghìn hồ sơ.

4. Rule-driven operations
- Auto-classification giúp giảm thao tác nhập tay lặp lại và tránh sai sót khi dữ liệu tăng nhanh.

5. Có đường chuyển đổi dần
- Chạy song song v1/v2 giúp refactor an toàn, không đứt luồng vận hành hiện tại.
