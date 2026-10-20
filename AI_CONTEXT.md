# 🤖 AI Context — BuildVault Handoff

This file is for any AI assistant picking up work on BuildVault. Read this first before touching anything.

---

## What This Is

BuildVault is a **maker project showcase platform** built and actively developed by Hugo Mazzei (GitHub: Mazha96). It is a live production app running at **https://mazhagarage.cloud**.

This is not a side project or demo — real users are on it. Be careful with DB migrations and breaking changes.

---

## Live Environment

| Thing | Detail |
|---|---|
| Server | VPS at `187.124.68.167` |
| Domain | `mazhagarage.cloud` (SSL via Let's Encrypt) |
| Process manager | PM2 — process name `buildvault` |
| Restart command | `pm2 restart buildvault` |
| Backend port | `3001` (nginx proxies 443 → 3001) |
| Source on server | `/root/.openclaw/workspace/buildvault/` |
| Database | `/root/.openclaw/workspace/buildvault/backend/buildvault.db` (SQLite) |
| Uploads | `/root/.openclaw/workspace/buildvault/backend/uploads/` |

**Deploy flow:**
```bash
# After any frontend change:
cd /root/.openclaw/workspace/buildvault/frontend
npm run build
pm2 restart buildvault

# After any backend change:
pm2 restart buildvault
```

---

## Auth — Clerk

This app uses **Clerk** for authentication. Do not remove or replace it.

- All protected API routes use `middleware/auth.js` which verifies Clerk JWTs
- Frontend uses `ClerkProvider` + `ClerkTokenProvider` (custom component that injects the token into axios)
- The `ClerkTokenProvider` wraps the whole app in `main.jsx`
- Token is accessed via `useAuth()` hook from `@clerk/clerk-react`
- **Do NOT use `window.Clerk` polling** — it doesn't work on mobile. Always use the `useAuth` hook.

Environment variables needed (not in repo — ask Hugo):
- `backend/.env` → `CLERK_SECRET_KEY=sk_test_...`
- `frontend/.env` → `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...`

---

## Known Users

| User | Role | Notes |
|---|---|---|
| `mazha` (Hugo) | `supermod` | Owner, can delete any community post/reply |
| `itslauraidk` (Laura) | `user` | Hugo's girlfriend, regular user |

---

## Architecture Notes

### API Base URL
The frontend uses `window.location.origin` as the API base — **not** a hardcoded port. This is intentional so nginx proxying works. Do not change it to `localhost:3001`.

```js
// api.js
const API_BASE = import.meta.env.VITE_API_BASE || window.location.origin;
```

### Database
SQLite via `better-sqlite3`. All queries are synchronous. The DB file is NOT in the repo — it lives on the server only. If you need to add a table or column:

```js
// Add it in backend/db.js in the initDB() function
// OR run a migration manually:
const db = require('./db');
db.prepare('ALTER TABLE foo ADD COLUMN bar TEXT').run();
```

### File Uploads
- Handled by `multer` in `routes/files.js`
- HEIC/HEIF (iPhone photos) are supported
- nginx is configured with `client_max_body_size 50M`
- Files stored at `backend/uploads/` — served at `/uploads/` path

### nginx
Config lives at `/etc/nginx/sites-available/buildvault` on the server.
After any nginx config change: `nginx -t && systemctl reload nginx`

---

## Feature Map

| Feature | Backend | Frontend |
|---|---|---|
| Projects CRUD | `routes/projects.js` | `pages/ProjectDetail.jsx`, `pages/Dashboard.jsx` |
| File uploads | `routes/files.js` | `components/CoverUploader.jsx`, `components/ImageUploader.jsx` |
| Social feed | `routes/posts.js` | `pages/Feed.jsx`, `components/PostCard.jsx` |
| Follow system | `routes/follow.js` | `pages/UserProfile.jsx`, `pages/MyProfile.jsx` |
| Points/Boost | `routes/points.js` | `pages/Feed.jsx`, `pages/Explore.jsx` |
| Community forum | `routes/community.js` | `pages/Community.jsx`, `pages/CommunityPost.jsx` |
| Inventory + CSV import | `routes/inventory.js` | `pages/Inventory.jsx`, `pages/ImportInventory.jsx` |
| Time logs + streaks | `routes/timelogs.js` | `components/TimeLogTab.jsx` |
| Focus Mode timer | — | `components/FocusMode.jsx` |
| Notifications | `routes/notifications.js` | `pages/Notifications.jsx`, `components/Navbar.jsx` |
| User profiles | `routes/users.js` | `pages/MyProfile.jsx`, `pages/UserProfile.jsx` |

---

## Design System — Do Not Break

| Token | Value |
|---|---|
| Background | `#0a0e1a` |
| Surface | `#0d1224` |
| Accent cyan | `#00d4ff` |
| Accent pink | `#ff2d78` |
| Text primary | `#e2e8f0` |
| Text muted | `#9ca3af` |
| Border | `rgba(255,255,255,0.07)` |

Dark theme only. No light mode. Inline styles are used throughout (no Tailwind classes in most components despite Tailwind being installed).

---

## What's In Progress / Known TODOs

- [ ] "Share Update" toggle on `ProjectDetail.jsx` file upload + task complete flow (backend supports `publish=true`, frontend modal exists as `PublishModal.jsx` but not wired in)
- [ ] CSV import still has auth token issue on multipart upload — investigate
- [ ] Clerk is on `pk_test_` (development keys) — double OTP email is a known dev-mode quirk, not a bug to fix in code
- [ ] Forge/Pulse/Muse sub-agents set up but Telegram bot pairing not completed

---

## Things That Will Break If You're Not Careful

1. **Don't remove `ClerkTokenProvider`** from `main.jsx` — auth will stop working on mobile
2. **Don't hardcode the API port** anywhere — use `window.location.origin`
3. **Don't rename the PM2 process** from `buildvault` — deploy scripts depend on it
4. **Don't run `npm run build` in `/backend/`** — backend has no build step, it runs directly
5. **Don't delete the `uploads/` folder** — it has user-uploaded photos
6. **Tags are stored as JSON strings** in the `projects.tags` column — always `JSON.parse()` before use
7. **Soft deletes on community posts/replies** — use `is_deleted=1`, never hard delete

---

## How to Run Locally

```bash
# Backend
cd backend
npm install
# Create backend/.env with CLERK_SECRET_KEY and PORT=3001
node index.js

# Frontend (separate terminal)
cd frontend
npm install
# Create frontend/.env with VITE_CLERK_PUBLISHABLE_KEY
npm run dev
# Runs on http://localhost:5173
```

---

## Who to Ask

This project is maintained by **Hugo Mazzei** via his AI assistant (Mazha) running on OpenClaw at `mazhagarage.cloud`. If something is unclear, check `README.md` or the route files — they're well commented.

Don't guess on DB migrations. Don't push breaking changes to `main` without testing. The site is live.
