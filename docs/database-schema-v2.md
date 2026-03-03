# WemePet V2 Data Schema (Module 1: Database Core)

## Mục tiêu
- Tách rõ các thực thể: `Account` (Personal/Farm/Dealer), `Collection`, `KoiProfile`, `GrowthLog`, `TraceEvent`.
- Đảm bảo truy xuất nguồn gốc xuyên suốt khi cá chuyển quyền sở hữu.
- Hỗ trợ scale danh sách lớn bằng `cursor pagination`.

## Thực thể

### 1) Account
- `id`: `ACC-*`
- `type`: `personal | farm | dealer`
- `email`, `displayName`, `role`, `status`

### 2) Collection
- `id`: `COL-*`
- `ownerAccountId`: liên kết 1-n với Account
- `autoRules`:
  - `autoVarieties[]`
  - `autoStatuses[]`
- `itemCount`: được đồng bộ tự động

### 3) KoiProfile
- `id` và `koiIdentityId` (immutable)
- `originAccountId`: nơi khởi tạo danh tính
- `currentOwnerAccountId`: chủ hiện tại
- `collectionMemberships[]`:
  - `{ collectionId, source: manual|auto, addedAt }`
- `growthSummary`, `observationNotes[]`, `media`

### 4) GrowthLog
- `id`: `GRO-*`
- `koiIdentityId`
- `measuredAt`, `sizeCm`, `weightKg`, `deltaSizeCm`, `deltaWeightKg`

### 5) TraceEvent
- `id`: `TEV-*`
- `koiIdentityId`
- `eventType`: `REGISTERED | TRANSFERRED | PROFILE_UPDATED | GROWTH_LOGGED | NOTE_ADDED | COLLECTION_UPDATED | LEGACY_IMPORT`
- `fromAccountId`, `toAccountId`, `actorAccountId`

## Quy tắc toàn vẹn
1. `Collection.ownerAccountId` phải tồn tại trong `Account`.
2. Một membership giữa `KoiProfile` và `Collection` không được trùng `collectionId`.
3. Membership `manual` ưu tiên hơn `auto` khi trùng collection.
4. Khi transfer ownership, membership manual cũ bị xóa để tránh orphan link sai owner.
5. Mọi thay đổi quan trọng đều ghi `TraceEvent`.

## API v2 chính
- `GET /api/v2/schema/overview`
- `POST/GET/PUT /api/v2/accounts`
- `POST/GET/PUT /api/v2/collections`
- `POST /api/v2/collections/:id/reclassify`
- `POST/DELETE /api/v2/collections/:id/items/:koiIdentityId`
- `POST/GET/PUT /api/v2/koi-profiles`
- `POST /api/v2/koi-profiles/:id/transfer`
- `POST/GET /api/v2/koi-profiles/:id/growth`
- `POST/GET /api/v2/koi-profiles/:id/notes`
- `GET /api/v2/koi-profiles/:id/trace`

## Pagination và payload nhẹ
- List API hỗ trợ `cursor` + `limit`
- `GET /api/v2/koi-profiles` mặc định trả media dạng tóm tắt:
  - `thumbnail`
  - `imageCount`
  - `videoCount`
- Dùng `includeMedia=true` khi cần payload đầy đủ.
