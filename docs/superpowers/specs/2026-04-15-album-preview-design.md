# Album Preview — Design Spec
**Date:** 2026-04-15

## Overview

Rebuild the existing album preview app into a professional full-stack Next.js application deployed on Vercel. The app has two distinct views: a **public view** (shareable link for end users) and a **password-protected edit view** (for the owner to manage content). All data persists in a server-side database, so every end user always sees the latest version regardless of browser or device.

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | Frontend + API routes in one project |
| Database | Vercel Postgres (Neon) | Free Hobby tier, stores metadata |
| File storage | Vercel Blob | Free Hobby tier (512MB), stores audio/video/images |
| Auth | iron-session | httpOnly cookie, password from env var |
| Deployment | Vercel | Same account already connected |

---

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | End-user album experience |
| `/edit` | Owner only (session cookie) | Edit all album data and upload media |
| `/edit/login` | Public | Password entry — redirects to `/edit` on success |

Middleware (`middleware.ts`) intercepts all `/edit` requests and redirects to `/edit/login` if no valid session cookie is present.

---

## API Routes

| Endpoint | Methods | Auth required | Purpose |
|---|---|---|---|
| `/api/auth` | POST, DELETE | No / Yes | Login (set cookie), Logout (clear cookie) |
| `/api/config` | GET, PUT | GET: No, PUT: Yes | Read or update EP name, artist, description, cover_url |
| `/api/tracks` | GET, POST | GET: No, POST: Yes | List all tracks, or add a new track |
| `/api/tracks/[id]` | PUT, DELETE | Yes | Update or delete a specific track |
| `/api/tracks/reorder` | PUT | Yes | Save new track order after drag-and-drop |
| `/api/upload` | POST | Yes | Upload file to Vercel Blob, return permanent URL |

---

## Database Schema

```sql
CREATE TABLE album (
  id          SERIAL PRIMARY KEY,
  ep_name     TEXT NOT NULL DEFAULT '',
  artist      TEXT NOT NULL DEFAULT '',
  description TEXT,
  cover_url   TEXT
);

CREATE TABLE tracks (
  id          SERIAL PRIMARY KEY,
  album_id    INT REFERENCES album(id) ON DELETE CASCADE,
  position    INT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  audio_url   TEXT,
  canvas_url  TEXT,
  cover_url   TEXT
);
```

The album table starts with a single seeded row. Tracks reference that row via `album_id`.

---

## Authentication

- Password stored as `ADMIN_PASSWORD` in Vercel environment variables
- On POST `/api/auth`: compare submitted password against env var (constant-time comparison), set signed httpOnly session cookie (7-day expiry) via iron-session
- On DELETE `/api/auth`: destroy session cookie
- Middleware checks for valid session on all `/edit` routes; invalid → redirect to `/edit/login`
- No user accounts, no email — single-owner model

---

## Edit View (`/edit`)

Preserves the existing glassmorphic dark UI from `CanvasPreview.html`. Functional changes:

1. **Login gate** — centered password prompt rendered at `/edit/login`. On correct password, cookie is set and user is redirected to `/edit`.
2. **EP panel** — fields for EP name, artist, description. Cover image upload button (file → `/api/upload` → URL saved via PUT `/api/config`). Changes saved on explicit "Save" button click.
3. **Track list** — drag-to-reorder (position saved via PUT `/api/tracks/reorder` on drop). Per-track card includes:
   - Title text input
   - Audio file upload (mp3/m4a)
   - Canvas video upload (mp4)
   - Per-track cover image upload (optional — falls back to EP cover)
   - Delete button
4. **Add Track** — POST `/api/tracks`, renders new card at bottom of list.
5. **"View as audience" button** — opens `/` in a new tab.
6. All saves are immediate API calls. No deploy step. Changes are live the moment they save.

---

## Public View (`/`)

Pixel-identical to the existing "the show" section of `CanvasPreview.html`. Functional change: data is loaded server-side via `GET /api/config` and `GET /api/tracks` at page render (Next.js Server Component), not from localStorage.

- Hero section: EP artwork, EP name, artist, description
- Track list sidebar: numbered list, active track highlighted, canvas indicator dot
- Now playing area: canvas video (looping, muted visual) + audio controls
- Keyboard shortcuts: Space (play/pause), ←/→ (seek 10s), ↑/↓ (volume)
- Responsive: stacks vertically on mobile

---

## File Upload Flow

1. User selects a file in the edit view (audio, video, or image)
2. Browser POSTs the file to `/api/upload` as `multipart/form-data`
3. API route streams the file to Vercel Blob using `@vercel/blob`'s `put()` function
4. Vercel Blob returns a permanent public CDN URL
5. URL is immediately written to the relevant Postgres column
6. Public view reads these URLs directly — no proxying needed; Blob serves via global CDN

Accepted file types and size guidance:
- Audio: mp3, m4a (recommended < 15MB per track)
- Canvas video: mp4 (recommended < 30MB per track)
- Cover images: jpg, png, webp (recommended < 2MB)

---

## Project File Structure

```
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Public view (Server Component)
│   ├── edit/
│   │   ├── page.tsx                # Edit view (Client Component)
│   │   └── login/
│   │       └── page.tsx            # Login page
│   └── api/
│       ├── auth/route.ts
│       ├── config/route.ts
│       ├── tracks/
│       │   ├── route.ts            # GET all, POST new
│       │   ├── [id]/route.ts       # PUT, DELETE
│       │   └── reorder/route.ts    # PUT reorder
│       └── upload/route.ts
├── components/
│   ├── PublicView.tsx              # Ported from CanvasPreview.html "the show"
│   ├── EditView.tsx                # Ported from CanvasPreview.html setup section
│   ├── TrackCard.tsx               # Individual track editor card
│   └── LoginGate.tsx               # Password prompt
├── lib/
│   ├── db.ts                       # Vercel Postgres client + query helpers
│   ├── auth.ts                     # iron-session config + session helpers
│   └── types.ts                    # Shared TypeScript types (Album, Track)
├── middleware.ts                   # Protects /edit routes
├── .env.local                      # ADMIN_PASSWORD, POSTGRES_URL, BLOB_READ_WRITE_TOKEN
└── package.json
```

---

## Environment Variables

| Variable | Source | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | Set manually in Vercel dashboard | Gate for edit view |
| `SESSION_SECRET` | Generated random string | Signs iron-session cookies |
| `POSTGRES_URL` | Auto-set by Vercel Postgres integration | DB connection string |
| `BLOB_READ_WRITE_TOKEN` | Auto-set by Vercel Blob integration | File upload auth |

---

## Deployment

The existing Vercel project (`album-preview-two.vercel.app`) stays as-is. The repo is converted to a Next.js project and connected to Vercel via GitHub (replacing the manual `deploy.py` / `deploy.js` scripts). Every `git push` to `main` triggers a new deployment automatically.

One-time setup steps (done once, not repeated):
1. `npx create-next-app` scaffolding in the repo
2. Add Vercel Postgres integration from the Vercel dashboard → connection string auto-injected
3. Add Vercel Blob integration from the Vercel dashboard → token auto-injected
4. Set `ADMIN_PASSWORD` and `SESSION_SECRET` as env vars in Vercel dashboard
5. Run the DB migration SQL (two CREATE TABLE statements) via Vercel Postgres query console

---

## What Is Preserved vs. Rebuilt

| Item | Status |
|---|---|
| Public view UI (dark theme, canvas player, controls) | Preserved — ported to React component |
| Edit view UI (glassmorphic panels, track cards) | Preserved — ported to React component |
| Local Flask server (`canvas_preview/app.py`) | Removed — replaced by Next.js API routes |
| Manual deploy scripts (`deploy.py`, `deploy.js`) | Removed — replaced by git push → Vercel CI |
| `config.json` with local file paths | Removed — replaced by Postgres + Blob URLs |
| `CanvasPreview.html` single-file approach | Removed — split into proper components |
