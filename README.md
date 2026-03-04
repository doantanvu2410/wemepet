# WemePet Platform (Hard Reset)

Production-grade rebuild with clean architecture, PostgreSQL, and modular domain services.

## Workspace
- `apps/api`: NestJS + Prisma API.
- `apps/web`: Next.js App Router frontend.
- `docs/architecture.md`: technical architecture notes.
- `docker-compose.yml`: local Postgres/Redis/MinIO stack.

Legacy app code has been fully removed. This repository now only contains the new platform stack.

## Local Setup
1. Start infra
```bash
docker compose up -d
```

2. Install dependencies
```bash
npm install
```

3. Configure env
```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

4. Run API
```bash
npm run dev:api
```

5. Run Web
```bash
npm run dev:web
```

## API Highlights
- JWT verification via JWKS (`AUTH_JWKS_URL`, `AUTH_ISSUER`, `AUTH_AUDIENCE`).
- Social feed: posts, media, comments tree, likes/bookmarks.
- Koi registry + moderation states.
- Transfer engine: user_id based, lock-safe, audit + outbox.
- Structured notifications with unread counters.
- S3 signed upload URL flow.
- Health endpoint for deployment checks: `/api/v1/healthz`.

For Firebase ID token verification set:
- `AUTH_JWKS_URL=https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`
- `AUTH_ISSUER=https://securetoken.google.com/<your-firebase-project-id>`
- `AUTH_AUDIENCE=<your-firebase-project-id>`

## Deploy: Vercel (Web)
Use one Vercel project for `apps/web`.

- Framework: `Next.js`
- Root Directory: `apps/web`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `.next`

Required env vars on Vercel:
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

## Deploy: Render (API + Worker)
Use `render.yaml` blueprint from repository root.

Services defined:
- `wemepet-api` (web service):
  - rootDir: `apps/api`
  - build: `npm install --include=dev && npm run build`
  - start: `npm run start:prod`
  - health check: `/api/v1/healthz`
- `wemepet-outbox-worker` (background worker):
  - rootDir: `apps/api`
  - build: `npm install --include=dev && npm run build`
  - start: `npm run worker:outbox`

Required env vars on Render (API):
- `DATABASE_URL`
- `REDIS_URL`
- `AUTH_JWKS_URL`
- `AUTH_ISSUER`
- `AUTH_AUDIENCE`
- `CORS_ORIGIN`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_FORCE_PATH_STYLE`
- `CDN_BASE_URL`

## Migration
- Prisma schema: `apps/api/prisma/schema.prisma`.
- Initial SQL migration: `apps/api/prisma/migrations/0001_init/migration.sql`.
- Legacy JSON migration script: `apps/api/scripts/migrate-json-to-postgres.ts` (reads from `legacy-data/` by default, or `LEGACY_JSON_DIR`).
- Hard reset data script: `apps/api/scripts/reset-database.ts` (`npm run db:reset-hard -w @wemepet/api`).

## Notes
- JSON files are not used by the new runtime.
- Deploy frontend on Vercel and backend on Render as separate services.
