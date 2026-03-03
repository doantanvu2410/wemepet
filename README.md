# Wemepet Project

## Structure
- `client/`: React + Vite frontend (deploy on Vercel).
- `server/`: Express API (deploy on Render).

## Local Development
1. Backend:
```bash
cd server
npm install
cp .env.example .env
npm start
```

2. Frontend:
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

## Deploy Backend on Render
- `render.yaml` is included at repo root.
- Service root directory: `server`.
- Required env vars:
  - `NODE_ENV=production`
  - `CORS_ORIGINS=https://<your-vercel-domain>`
  - `PORT` is provided by Render automatically.

Health check endpoints:
- `GET /`
- `GET /healthz`

## Deploy Frontend on Vercel
- Set project root to `client`.
- `client/vercel.json` includes SPA rewrites.
- Required env vars:
  - `VITE_API_ORIGIN=https://<your-render-backend-domain>`

## Notes
- Current backend data uses JSON files in `server/*.json`.
- Render filesystem is ephemeral, so data in local files is not durable across deploy/restart.
- For production reliability, migrate to a persistent database (MongoDB/Postgres).
