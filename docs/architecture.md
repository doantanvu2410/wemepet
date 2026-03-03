# WemePet V3 Architecture (Hard Reset)

## 1. Domain Modules
- Auth & Identity: JWT verification (Firebase/OIDC), profile hydration, role mapping.
- Social Feed: posts, post media, likes, comments (tree), bookmarks.
- Koi Registry: koi profile entity (independent from post), certification media, moderation state.
- Transfer Engine: user_id-based ownership transfer with lock and serializable transaction.
- Notification Engine: structured notification metadata + unread counter.
- Admin: moderation queue, role assignment, post takedown, transfer supervision.
- Audit & Outbox: every critical action persisted for compliance and async fan-out.

## 2. Koi Modeling Decision
- Koi is a first-class entity (`koi`) and not only a post extension.
- A post can optionally reference koi (`posts.koi_id`) for social visibility (`PostKind.KOI_PROFILE`).
- This separation keeps ownership/legal flows independent from social content lifecycle.

## 3. Backend Runtime
- Framework: NestJS + Fastify.
- Data: PostgreSQL + Prisma.
- Cache: Redis.
- File flow: S3 signed upload URL (`media_upload_intents` + object key trace).
- Security: JWT validation via JWKS, role guard, global validation pipe, rate limit, helmet.

## 4. Data Integrity Strategy
- FK constraints across core entities.
- Composite PK for likes/bookmarks/follows.
- Partial unique index: one `PENDING` transfer per koi.
- `koi.is_transfer_locked` + `koi.lock_version` for concurrency control.
- Transaction isolation `SERIALIZABLE` for transfer transitions.

## 5. Async Strategy
- Outbox events stored in `outbox_events`.
- Worker `src/workers/outbox.worker.ts` claims pending events and marks processed.
- Current phase persists internal events; next phase can publish to websocket/queue.

## 6. Frontend Runtime
- Next.js App Router.
- State: Zustand (auth session), TanStack Query (server state + optimistic update).
- Pages: feed, koi registry, transfers, notifications, login.
- Visual direction: warm-orange social UI with responsive layout.

## 7. Migration from Legacy JSON
- Script: `apps/api/scripts/migrate-json-to-postgres.ts`.
- Strategy: map legacy IDs -> UUID, preserve relationships by mapping table.
- Empty-file safe: migration does nothing harmful if JSON arrays are empty.

## 8. Deployment Baseline
- `docker-compose.yml`: Postgres, Redis, MinIO for local parity.
- CI: `.github/workflows/ci.yml` workspace install/build/test.
- Production recommendation: managed Postgres/Redis/S3 + API/Web separated services.
