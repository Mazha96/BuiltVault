# BuildVault — Backend Documentation

## Overview

BuildVault's backend is a **Node.js + Express 5** REST API backed by **SQLite** (via `better-sqlite3`). Authentication is handled entirely by **Clerk** — no passwords are stored in this app. The server runs on **port 3001** and also serves the compiled React frontend as a static SPA.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v22 |
| Framework | Express 5 |
| Database | SQLite via `better-sqlite3` (synchronous) |
| Auth | Clerk (JWT verification) |
| File uploads | Multer (disk storage) |
| IDs | UUID v4 |
| Config | dotenv |

---

## File Structure

```
buildvault/backend/
├── index.js              ← Entry point, server bootstrap
├── db.js                 ← SQLite connection + schema
├── .env                  ← Secrets (Clerk key, port, DB path)
├── middleware/
│   └── auth.js           ← Clerk JWT verification middleware
├── routes/
│   ├── projects.js       ← Projects, BOM, tasks
│   ├── inventory.js      ← Global parts inventory
│   └── files.js          ← File uploads (multer)
└── uploads/              ← Uploaded files stored here
```

---

## Environment Variables (`.env`)

```env
PORT=3001
CLERK_SECRET_KEY=sk_test_...       # Used to verify Clerk JWTs
DB_PATH=./buildvault.db            # SQLite file location
UPLOAD_DIR=./uploads               # Where uploaded files are saved
```

---

## Entry Point (`index.js`)

Bootstraps the Express app in this order:

1. `cors()` — allows cross-origin requests (needed for dev)
2. `express.json()` — parses JSON request bodies
3. `/uploads` static route — serves uploaded files directly
4. API routes mounted at `/api/*`
5. Health check at `GET /api/health`
6. Frontend SPA fallback — serves `frontend/dist/index.html` for all non-API GET requests (enables React Router client-side navigation)

> **Note:** The SPA fallback uses `fs.readFileSync` instead of `res.sendFile` due to an Express 5 incompatibility with wildcard route patterns.

---

## Authentication Middleware (`middleware/auth.js`)

Every protected route passes through this middleware before the handler runs.

**What it does:**
1. Reads the `Authorization: Bearer <token>` header
2. Verifies the JWT using Clerk's `verifyToken()` with your secret key
3. Extracts the Clerk user ID from `payload.sub`
4. **Auto-upserts** the Clerk user into the local `users` table — this is required because the `projects` and `inventory_parts` tables have a `FOREIGN KEY (user_id) REFERENCES users(id)` constraint. Since Clerk manages real auth, we store a minimal placeholder row on first login.
5. Sets `req.user = { id: clerkUserId }` for downstream route handlers

**If auth fails:** returns `401 { error: "Invalid token" }`

---

## Database Schema (`db.js`)

SQLite with WAL journal mode (better concurrent read performance).

### `users`
Minimal local mirror of Clerk users. Created automatically on first authenticated request.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Clerk user ID (e.g. `user_2abc...`) |
| `username` | TEXT | From Clerk token or generated |
| `email` | TEXT | From Clerk token |
| `password_hash` | TEXT | Always `"clerk_managed"` — not used |
| `bio`, `avatar_url` | TEXT | Optional profile fields |
| `created_at` | TEXT | SQLite `datetime('now')` |

---

### `projects`
Core entity. Each project belongs to one user.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `user_id` | TEXT FK → users | Owner |
| `title` | TEXT | Required |
| `description` | TEXT | Optional |
| `status` | TEXT | `draft` / `in-progress` / `complete` |
| `is_public` | INTEGER | `0` or `1` |
| `category` | TEXT | `electronics`, `3d-printing`, `woodworking`, etc. |
| `cover_url` | TEXT | Optional cover image URL |
| `total_cost` | REAL | Auto-recalculated from BOM items |
| `created_at`, `updated_at` | TEXT | Timestamps |

---

### `inventory_parts`
Global parts library, not tied to any single project.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `user_id` | TEXT FK → users | Owner |
| `name` | TEXT | Required |
| `unit` | TEXT | `pcs`, `m`, `kg`, etc. |
| `stock_qty` | REAL | Current stock level |
| `unit_cost` | REAL | Cost per unit |
| `supplier`, `supplier_url` | TEXT | Optional sourcing info |
| `is_3d_printed` | INTEGER | `0` or `1` |
| `filament_type`, `filament_grams`, `filament_cost_per_kg` | TEXT/REAL | For 3D printed parts |

---

### `bom_items`
Bill of Materials — parts attached to a specific project.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `project_id` | TEXT FK → projects | Parent project |
| `part_id` | TEXT FK → inventory_parts | Optional — links to global inventory |
| `name` | TEXT | Part name (can be free-text or from inventory) |
| `qty` | REAL | Quantity used |
| `unit_cost`, `total_cost` | REAL | `total_cost` is auto-calculated |
| `is_3d_printed` | INTEGER | Enables filament cost formula |
| `filament_*` | REAL/TEXT | Used when `is_3d_printed = 1` |

**Cost formula:**
- Normal part: `total_cost = qty × unit_cost`
- 3D printed: `total_cost = (filament_grams / 1000) × filament_cost_per_kg`

**Auto-recalc:** Every time a BOM item is added, updated, or deleted, `recalcCost()` runs and updates `projects.total_cost`.

---

### `tasks`
Checklist items for a project.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `project_id` | TEXT FK → projects | Parent project |
| `title` | TEXT | Task description |
| `category` | TEXT | `general`, `design`, `sourcing`, `build`, `testing`, `done` |
| `is_done` | INTEGER | `0` or `1` |
| `sort_order` | INTEGER | For future drag-to-reorder |

**Progress calculation:** `done_tasks / total_tasks × 100` — computed on every `GET /api/projects/:id`, never stored.

---

### `project_files`
Files attached to a project (images, PDFs, STLs, blueprints).

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `project_id` | TEXT FK → projects | Parent project |
| `filename` | TEXT | UUID-based filename on disk |
| `original_name` | TEXT | Original filename from user |
| `file_type` | TEXT | `image`, `pdf`, `3d`, `blueprint`, `other` |
| `file_size` | INTEGER | Bytes |
| `url` | TEXT | Public path: `/uploads/<filename>` |

---

## API Routes

### Projects — `/api/projects`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/public` | ❌ | Public gallery (all `is_public=1` projects) |
| `GET` | `/` | ✅ | My projects |
| `GET` | `/:id` | ❌/✅ | Single project with BOM, tasks, files, progress |
| `POST` | `/` | ✅ | Create project |
| `PUT` | `/:id` | ✅ | Update project. **If status → `complete`: deducts BOM quantities from inventory stock** |
| `DELETE` | `/:id` | ✅ | Delete project + cascade BOM/tasks/files |

#### BOM sub-routes (under `/api/projects/:id/bom`)
| Method | Path | Description |
|---|---|---|
| `POST` | `/` | Add BOM item, triggers `recalcCost()` |
| `PUT` | `/:bomId` | Update BOM item, triggers `recalcCost()` |
| `DELETE` | `/:bomId` | Remove BOM item, triggers `recalcCost()` |

#### Task sub-routes (under `/api/projects/:id/tasks`)
| Method | Path | Description |
|---|---|---|
| `POST` | `/` | Add task |
| `PUT` | `/:taskId` | Update task (toggle done, rename) |
| `DELETE` | `/:taskId` | Delete task |

---

### Inventory — `/api/inventory`

All routes require auth. Parts belong to the authenticated user.

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | List all parts with `committed_qty` and `available_qty` computed |
| `POST` | `/` | Add new part |
| `PUT` | `/:id` | Update part (name, stock qty, cost, etc.) |
| `DELETE` | `/:id` | Remove part |

**committed_qty:** Sum of `bom_items.qty` across all active (non-complete) projects that reference this part via `part_id`.

**available_qty:** `stock_qty - committed_qty`

---

### Files — `/api/files`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/:projectId` | ✅ | Upload file (multipart/form-data, field name: `file`, max 50MB) |
| `DELETE` | `/:projectId/:fileId` | ✅ | Delete file record (does not delete from disk yet) |

**Auto-detected file types by extension:**
- `.jpg .jpeg .png .gif .webp` → `image`
- `.pdf` → `pdf`
- `.stl .obj .3mf` → `3d`
- `.dxf .svg` → `blueprint`
- anything else → `other`

Files are stored at: `uploads/<uuid><ext>` and served publicly at `http://<host>:3001/uploads/<filename>`

---

## Key Business Logic

### `recalcCost(projectId)`
Called after every BOM add/edit/delete. Sums all `bom_items.total_cost` for the project and writes the result to `projects.total_cost`.

### Inventory consumption on project completion
When `PUT /api/projects/:id` receives `{ status: "complete" }` and the project wasn't already complete:
1. Fetches all BOM items for the project
2. For any item with a `part_id` (linked to inventory), runs:
   `UPDATE inventory_parts SET stock_qty = MAX(0, stock_qty - qty) WHERE id = part_id`
3. Stock can never go below 0

### Progress calculation
`GET /api/projects/:id` always returns a fresh `progress` value:
```js
progress = Math.round((done_tasks / total_tasks) * 100)
// Returns 0 if no tasks
```

---

## How to Start the Server

```bash
cd buildvault/backend
node index.js
# Running on port 3001
```

To keep it running after SSH disconnect, it's launched as a background process via OpenClaw's exec sessions. For production, use `pm2` or Docker.

---

## Known Limitations / Future Work

- `DELETE /files` removes the DB record but **does not delete the file from disk** — disk cleanup needed
- `users` table has legacy columns (`password_hash`, `recovery_question`) from pre-Clerk auth — safe to ignore
- No rate limiting on file uploads
- No webhook from Clerk to sync user profile updates (username/avatar changes in Clerk won't reflect locally)
- `sort_order` on tasks is stored but not yet used — drag-to-reorder not implemented
