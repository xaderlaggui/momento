# Momento

One phone camera shared at an event. The host opens a room, guests join by code, each guest keeps up to 20 shots in the shared camera, and the host collects everything as one zip.

## Setup

1. Create a Supabase project (free tier).
2. Auth → Providers → enable **Anonymous** sign-ins (guests), plus **Email** and **Google** (hosts).
3. Auth → URL Configuration → set **Site URL** to your app origin and add these to **Redirect URLs**:
   - `<origin>/auth/callback` — magic link, Google, and email confirmation
   - `<origin>/auth/reset` — password recovery

   Auth uses the **PKCE** flow (`src/lib/supabase.ts`), so tokens never reach the URL; the redirect returns a single-use `?code=`. This requires the link to open in the **same browser** that started sign-in. An in-app email browser breaks it — the callback screen offers a retry.
4. SQL Editor → run the migrations in filename order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_fix_join_room_v_count.sql`

   Run both. 0001 leaves `v_count` undeclared, so a fresh install without 0002 fails every guest join with `SQLSTATE 42703`.
5. `cp .env.example .env` (Windows: `copy .env.example .env`), fill:
   - `VITE_SUPABASE_URL` — Project Settings → API → Project URL
   - `VITE_SUPABASE_ANON_KEY` — Project Settings → API → anon public key
6. Install and run (pnpm/npm both fine):
   ```
   pnpm install
   pnpm dev
   ```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server |
| `pnpm build` | Typecheck then production build |
| `pnpm preview` | Serve the build |
| `pnpm test:e2e` | Playwright checks (starts the dev server itself) |

## Routes

The site root is the single door: a guest types the room code, a host signs in on the same screen. A signed-in host lands on `/dashboard`.

| Path | Screen |
| --- | --- |
| `/` | Landing — room code entry and host sign-in |
| `/auth` | Host sign-in / registration (Google, magic link, password) |
| `/auth/callback` | Auth redirect landing — exchanges the code, then `/dashboard` |
| `/auth/reset` | Set a new password after recovery |
| `/r/:code` | Guest join |
| `/r/:code/camera` | Shared camera |
| `/r/:code/done` | Guest wrap-up |
| `/dashboard` | Host rooms |
| `/room/:code` | Host room detail |
| `/room/:code/share` | Host QR and code |

`/login`, `/join`, and `/r` all redirect to `/`.

## Rules

- 20 kept shots per guest, enforced by `photo_submit` / `photo_keep` RPCs (server-side, transaction-safe).
- Retake is free: the pending shot is deleted, no chance burned.
- Closing a room is permanent: uploads rejected, gallery stays viewable, zip download keeps working.

## Tests

Playwright proves render, routing, and a11y basics at 390px and 1440px. It cannot prove the camera, a real magic-link email, or a real QR scan — those need a real device.
