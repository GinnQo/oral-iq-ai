# Deployment Guide

## Recommended hosting stack

- Frontend: Vercel
- Backend: Render (or Fly.io)
- Database: Neon or Supabase Postgres with `pgvector`

## 1. Deploy the Next.js frontend to Vercel

1. Connect your GitHub repository to Vercel.
2. Use the root of this repo.
3. Set these environment variables in Vercel:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (e.g. `https://oral-iq-ai.vercel.app`)
   - `OPENAI_API_KEY`
4. Vercel should build with `npm install` and `npm run build` automatically.

## 2. Deploy the FastAPI backend to Render

1. Create a new Web Service on Render.
2. Select `Docker` and connect the same GitHub repo.
3. Set build command: `docker build -t speaker-recognition .`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
5. Add env var:
   - `SR_DATABASE_URL` = your managed Postgres connection string
6. Expose the service on a public URL (Render handles routing).

## 3. Setup managed Postgres with `pgvector`

### Neon

1. Create a database on Neon.
2. Enable the `vector` extension.
3. Use the Neon connection string as `SR_DATABASE_URL`.

### Supabase

1. Create a project.
2. Enable the `pgvector` extension in SQL:

```sql
create extension if not exists vector;
```

3. Use the Supabase database URL as `SR_DATABASE_URL`.

## 4. Initialize the DB schema

Run the SQL in `services/speaker-recognition/alembic_init.sql` against the managed Postgres:

```bash
psql "$SR_DATABASE_URL" -f services/speaker-recognition/alembic_init.sql
```

## 5. Connect the frontend to the backend

Your frontend currently does not directly call the speaker service yet. If you want to expose it from the app, add a proxy route or frontend API route that uses the Render service URL.
When deploying to Vercel, set an environment variable `SPEAKER_SERVICE_URL` to the Render (or Fly) service URL. The app includes a proxy at `/api/speaker/*` which forwards requests server-side to the speaker service.

## 6. Optional: GitHub Actions

Use GitHub Actions to deploy on push to `main` and to run tests.

---

### Notes

- If you deploy the speaker service to Render, its public URL will look like `https://oral-iq-speaker.onrender.com`.
- Use that URL when wiring any future frontend calls to `/enroll` or `/identify`.
