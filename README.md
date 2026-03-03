# WemePet Platform (Hard Reset)

Production-grade rebuild with clean architecture, PostgreSQL, and modular domain services.

## Workspace
- `apps/api`: NestJS + Prisma API.
- `apps/web`: Next.js App Router frontend.
- `docs/architecture.md`: technical architecture notes.
- `docker-compose.yml`: local Postgres/Redis/MinIO stack.

Legacy folders (`client`, `server`) are kept only for migration reference.

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
```

4. Run API
```bash
cd apps/api
npm run prisma:generate
npm run prisma:dev
npm run dev
```

5. Run Web
```bash
cd apps/web
npm run dev
```

## API Highlights
- JWT verification via JWKS (`AUTH_JWKS_URL`, `AUTH_ISSUER`, `AUTH_AUDIENCE`).
- Social feed: posts, media, comments tree, likes/bookmarks.
- Koi registry + moderation states.
- Transfer engine: user_id based, lock-safe, audit + outbox.
- Structured notifications with unread counters.
- S3 signed upload URL flow.

For Firebase ID token verification set:
- `AUTH_JWKS_URL=https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`
- `AUTH_ISSUER=https://securetoken.google.com/<your-firebase-project-id>`
- `AUTH_AUDIENCE=<your-firebase-project-id>`

## Migration
- Prisma schema: `apps/api/prisma/schema.prisma`.
- Initial SQL migration: `apps/api/prisma/migrations/0001_init/migration.sql`.
- Legacy JSON migration script: `apps/api/scripts/migrate-json-to-postgres.ts`.
- Hard reset data script: `apps/api/scripts/reset-database.ts` (`npm run db:reset-hard`).

## Notes
- JSON files are not used by the new runtime.
- Use Firebase Web config in `apps/web/.env.local` and point API auth JWKS to your Firebase project.
