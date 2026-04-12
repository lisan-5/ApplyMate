# ApplyMate

Frontend:
- React
- TypeScript
- Vite
- Tailwind

Backend:
- Python standard library HTTP server
- Supabase Postgres
- Supabase Storage
- Signed token auth
- Gemini API integration

## Local development

Backend:

```bash
python backend/server.py
```

Frontend:

```bash
npm run dev
```

The frontend expects `VITE_API_URL` to point at the backend.

## Production deploy

Recommended split:
- Frontend on Vercel
- Backend on Render
- Database on Supabase Postgres
- File storage on Supabase Storage

### Render

This repo includes [render.yaml](/abs/path/c:/Users/lisan/Desktop/applymate1/render.yaml).

Required backend env vars:
- `GEMINI_API_KEY`
- `APPLYMATE_ALLOWED_ORIGINS`
- `SUPABASE_DB_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Recommended backend env vars:
- `APPLYMATE_SECRET`
- `GEMINI_MODEL`
- `SUPABASE_STORAGE_BUCKET`

Notes:
- The backend now uses hosted Supabase Postgres and Supabase Storage, so Render does not need a persistent disk.
- The backend health endpoint is `/api/health`.

### Vercel

This repo includes [vercel.json](/abs/path/c:/Users/lisan/Desktop/applymate1/vercel.json) for Vite SPA routing.

Required frontend env var:
- `VITE_API_URL`

Set `VITE_API_URL` to your Render backend URL, for example:

```bash
https://applymate-backend.onrender.com
```

## Supabase setup

Create:
- a Postgres project
- a private storage bucket named `scholarship-files`

Use the session-mode pooler connection string from Supabase for `SUPABASE_DB_URL`.
