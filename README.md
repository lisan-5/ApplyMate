# ApplyMate

Frontend:
- React
- TypeScript
- Vite
- Tailwind

Backend:
- Python standard library HTTP server
- SQLite
- Local file storage
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

### Render

This repo includes [render.yaml](/abs/path/c:/Users/lisan/Desktop/applymate1/render.yaml).

Required backend env vars:
- `GEMINI_API_KEY`
- `APPLYMATE_ALLOWED_ORIGINS`

Recommended backend env vars:
- `APPLYMATE_SECRET`
- `GEMINI_MODEL`

Notes:
- The backend uses SQLite and file uploads, so Render should use the included persistent disk.
- The backend health endpoint is `/api/health`.

### Vercel

This repo includes [vercel.json](/abs/path/c:/Users/lisan/Desktop/applymate1/vercel.json) for Vite SPA routing.

Required frontend env var:
- `VITE_API_URL`

Set `VITE_API_URL` to your Render backend URL, for example:

```bash
https://applymate-backend.onrender.com
```

## Important deployment note

This backend is now deployable on Render, but it is still a single-process SQLite app. That is acceptable for an early deployment, but it is not the right long-term production architecture for high concurrency or multi-instance scaling.
