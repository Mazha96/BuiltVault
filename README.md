# 🔧 BuildVault

> A maker project showcase platform — track builds, share progress, connect with other makers.

Live at: **[mazhagarage.cloud](https://mazhagarage.cloud)**

---

## What is BuildVault?

BuildVault is a full-stack web app for makers, builders, and creators to document and share their projects. Whether you're building electronics, 3D printing, writing a song, or learning a new skill — BuildVault gives you the tools to track progress, share updates, and connect with others.

---

## Features

### Projects
- Create public or private projects with title, description, category, and tags
- Cover photo upload (HEIC/iPhone support)
- Progress bar based on task completion
- Cost tracking via BOM (Bill of Materials)
- 5 tabs per project: Overview, BOM, Tasks, Files, Updates, Time Log

### Feed & Social
- Follow users and projects
- Post progress updates (photos + captions) from file uploads or task completions
- Comment on posts
- Activity feed showing updates from followed users/projects

### Points & Boosts
- Give ⚡ Boost points to projects you love (10 points/day budget)
- Leaderboard: Today / This Week / All Time
- Points displayed on project and Explore cards

### Community Forum
- Categorized posts: General, Help, Showcase, Electronics, 3D Printing, Software, Woodworking, Metalwork
- Threaded replies with image support
- Link community posts to a specific project
- Supermod role can delete any post/reply

### Inventory & BOM
- Personal parts inventory shared across all projects
- Import purchase history via CSV (Amazon, DigiKey, Mouser, LCSC, AliExpress)
- Smart auto-categorizer filters out non-maker items (food, clothing, etc.)
- Human review step before saving imports
- BOM per project linked to inventory items
- Available qty auto-calculated (stock - committed across active projects)

### Focus Mode
- 25 / 30 / 60 minute countdown timer per project
- Full-screen overlay with circular progress ring
- Color shifts as time runs out (cyan → yellow → red)
- Sound notification on completion
- Auto-opens progress log form when timer ends
- Streak tracking with milestone achievements:
  - 🔥 3 days — On a Roll
  - 🔥 7 days — One Week
  - ⚡ 14 days — Two Weeks
  - 🏆 30 days — One Month
  - 💀 60 days — Unstoppable
  - 👑 100 days — Legend

### Time Log
- Log work sessions with duration and notes
- Activity chart (14-day bar graph)
- Current streak / Best streak / Weekly total
- Milestone badge display

### Profiles
- Public user profiles with project grid and follow/unfollow
- Own profile with Followers / Following / Projects tabs
- Display name and bio editing

### Notifications
- Bell icon in navbar with unread count (polls every 60s)
- Notified on: new follower, project boost, community reply

---

## Tech Stack

### Backend
| Package | Purpose |
|---|---|
| Node.js + Express | API server |
| better-sqlite3 | Database (SQLite) |
| @clerk/express | Auth middleware (JWT verification) |
| multer | File uploads |
| csv-parse | CSV import parsing |
| uuid | ID generation |
| bcryptjs | Password hashing (legacy) |
| dotenv | Environment config |

### Frontend
| Package | Purpose |
|---|---|
| React 18 + Vite | UI framework + build tool |
| @clerk/clerk-react | Authentication UI + session |
| react-router-dom | Client-side routing |
| axios | HTTP client |
| lucide-react | Icons |
| Tailwind (via index.css) | Utility styles |

### Infrastructure
| Component | Detail |
|---|---|
| VPS | Ubuntu, 187.124.68.167 |
| Domain | mazhagarage.cloud |
| Process manager | PM2 (auto-restart, survives reboots) |
| Reverse proxy | nginx (SSL termination, 50MB upload limit) |
| SSL | Let's Encrypt |
| Database | SQLite file at `backend/buildvault.db` |
| File storage | Local disk at `backend/uploads/` |

---

## Project Structure

```
buildvault/
├── backend/
│   ├── index.js              # Express app entry point
│   ├── db.js                 # SQLite connection + schema init
│   ├── .env                  # Environment variables (not committed)
│   ├── middleware/
│   │   └── auth.js           # Clerk JWT verification middleware
│   ├── routes/
│   │   ├── auth.js           # Legacy auth (register/login)
│   │   ├── projects.js       # Project CRUD
│   │   ├── files.js          # File upload/download
│   │   ├── follow.js         # Follow users/projects
│   │   ├── users.js          # User profiles
│   │   ├── posts.js          # Feed posts + comments
│   │   ├── points.js         # Boost points + leaderboard
│   │   ├── community.js      # Forum posts + replies
│   │   ├── inventory.js      # Parts inventory + CSV import
│   │   ├── timelogs.js       # Time tracking + streaks
│   │   └── notifications.js  # Notification system
│   └── uploads/              # Uploaded files (gitignored)
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── .env                  # Clerk publishable key (not committed)
    ├── src/
    │   ├── main.jsx          # App entry, routing, Clerk provider
    │   ├── api.js            # Axios instance + API helpers
    │   ├── index.css         # Global styles + dark theme
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── ClerkTokenProvider.jsx
    │   │   ├── FocusMode.jsx
    │   │   ├── TimeLogTab.jsx
    │   │   ├── PostCard.jsx
    │   │   ├── ProjectCoverCard.jsx
    │   │   ├── CoverUploader.jsx
    │   │   ├── PublishModal.jsx
    │   │   ├── TagInput.jsx
    │   │   └── ImageUploader.jsx
    │   └── pages/
    │       ├── Home.jsx
    │       ├── Dashboard.jsx
    │       ├── ProjectDetail.jsx
    │       ├── Explore.jsx
    │       ├── Feed.jsx
    │       ├── Community.jsx
    │       ├── CommunityPost.jsx
    │       ├── Inventory.jsx
    │       ├── ImportInventory.jsx
    │       ├── MyProfile.jsx
    │       ├── UserProfile.jsx
    │       ├── Notifications.jsx
    │       ├── SignInPage.jsx
    │       └── SignUpPage.jsx
    └── dist/                 # Built output (gitignored)
```

---

## Database Schema

### users
| Column | Type | Notes |
|---|---|---|
| id | TEXT | Clerk user ID |
| username | TEXT | Unique handle |
| email | TEXT | |
| display_name | TEXT | Shown in UI |
| bio | TEXT | |
| role | TEXT | `user` or `supermod` |
| avatar_url | TEXT | |
| created_at | TEXT | |

### projects
| Column | Type | Notes |
|---|---|---|
| id | TEXT | UUID |
| user_id | TEXT | FK → users |
| title | TEXT | |
| description | TEXT | |
| status | TEXT | `active`, `complete`, `paused` |
| is_public | INTEGER | 0/1 |
| category | TEXT | |
| cover_url | TEXT | |
| total_cost | REAL | Sum from BOM |
| tags | TEXT | JSON array |

### inventory_parts
| Column | Type | Notes |
|---|---|---|
| id | TEXT | UUID |
| user_id | TEXT | FK → users |
| name | TEXT | |
| category | TEXT | electronics/tools/filament/hardware/power/maker_misc |
| source | TEXT | amazon/digikey/mouser/lcsc/aliexpress/manual |
| stock_qty | INTEGER | |
| unit_cost | REAL | |
| order_date | TEXT | From import |
| order_id | TEXT | From import |

### time_logs
| Column | Type | Notes |
|---|---|---|
| id | TEXT | UUID |
| project_id | TEXT | FK → projects |
| user_id | TEXT | FK → users |
| duration_minutes | INTEGER | |
| notes | TEXT | |
| logged_at | TEXT | ISO datetime |
| focus_session | INTEGER | 1 if logged via Focus Mode |

### achievements
| Column | Type | Notes |
|---|---|---|
| id | TEXT | UUID |
| user_id | TEXT | |
| project_id | TEXT | |
| type | TEXT | `streak` |
| milestone | INTEGER | 3/7/14/30/60/100 |
| unlocked_at | TEXT | |

*(See `backend/db.js` for full schema of all 17 tables)*

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <clerk_jwt>` header.

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Legacy register |
| POST | `/auth/login` | No | Legacy login |
| GET | `/auth/me` | Yes | Current user |

### Projects
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/projects` | No | All public projects |
| GET | `/projects/:id` | No | Single project |
| POST | `/projects` | Yes | Create project |
| PUT | `/projects/:id` | Yes | Update project |
| DELETE | `/projects/:id` | Yes | Delete project |
| POST | `/projects/:id/tasks` | Yes | Add task |
| PUT | `/projects/:id/tasks/:taskId` | Yes | Toggle task |

### Files
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/files/:projectId` | Yes | Upload file |
| GET | `/files/:projectId` | No | List files |
| DELETE | `/files/:projectId/:fileId` | Yes | Delete file |
| POST | `/files/:projectId/cover` | Yes | Upload cover photo |

### Posts & Feed
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/posts/feed` | Yes | Following feed |
| GET | `/posts/project/:id` | No | Posts for project |
| GET | `/posts/history/:id` | No | Full project history |
| POST | `/posts/manual` | Yes | Manual post |
| GET | `/posts/:id/comments` | No | Get comments |
| POST | `/posts/:id/comments` | Yes | Add comment |
| DELETE | `/posts/:id/comments/:cid` | Yes | Delete comment |

### Points
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/points/me` | Yes | My daily remaining |
| POST | `/points/:projectId` | Yes | Boost a project |
| GET | `/points/leaderboard` | No | `?period=today/week/all` |

### Users & Follow
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Yes | Own profile |
| PATCH | `/users/me` | Yes | Update profile |
| GET | `/users/:id` | Yes | Public profile |
| POST | `/follow/user/:id` | Yes | Follow user |
| DELETE | `/follow/user/:id` | Yes | Unfollow user |
| POST | `/follow/project/:id` | Yes | Follow project |
| DELETE | `/follow/project/:id` | Yes | Unfollow project |

### Community
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/community` | Yes | List posts `?category=&search=` |
| POST | `/community` | Yes | Create post |
| GET | `/community/:id` | Yes | Post + replies |
| DELETE | `/community/:id` | Yes | Delete post (own or mod) |
| POST | `/community/:id/replies` | Yes | Add reply |
| DELETE | `/community/:id/replies/:rid` | Yes | Delete reply |

### Inventory
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/inventory` | Yes | List parts `?search=&category=` |
| POST | `/inventory` | Yes | Add part manually |
| PUT | `/inventory/:id` | Yes | Update part |
| DELETE | `/inventory/:id` | Yes | Delete part |
| POST | `/inventory/import/preview` | Yes | Parse CSV (no save) |
| POST | `/inventory/import/confirm` | Yes | Save reviewed items |

### Time Logs
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/timelogs/:projectId` | Yes | Logs + streak + chart |
| POST | `/timelogs/:projectId` | Yes | Log session |
| DELETE | `/timelogs/:projectId/:id` | Yes | Delete log |

### Notifications
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | Yes | List + unread count |
| POST | `/notifications/:id/read` | Yes | Mark read |
| POST | `/notifications/read-all` | Yes | Mark all read |

---

## Environment Variables

### Backend (`backend/.env`)
```
PORT=3001
CLERK_SECRET_KEY=sk_test_...
UPLOAD_DIR=./uploads
```

### Frontend (`frontend/.env`)
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- npm

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in your Clerk secret key
node index.js
# runs on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # fill in your Clerk publishable key
npm run dev
# runs on http://localhost:5173
```

### Build for production
```bash
cd frontend
npm run build
# output in frontend/dist/ — served by Express static
```

---

## Deployment

The app runs as a single Node process serving both the API and the built frontend static files.

```bash
# On the server
pm2 start backend/index.js --name buildvault
pm2 save
pm2 startup   # auto-start on reboot
```

nginx proxies all traffic on port 443 → Node on port 3001.

---

## Design System

| Token | Value |
|---|---|
| Background | `#0a0e1a` |
| Surface | `#0d1224` |
| Border | `rgba(255,255,255,0.07)` |
| Accent blue | `#00d4ff` |
| Accent pink | `#ff2d78` |
| Text primary | `#e2e8f0` |
| Text muted | `#9ca3af` |
| Font (headings) | Rajdhani |
| Font (body) | System sans-serif |

---

## Roles

| Role | Permissions |
|---|---|
| `user` | Own projects, own posts/replies |
| `supermod` | Delete any community post/reply, `⚡ MOD` badge |

---

## .gitignore

Make sure your `.gitignore` includes:

```
# Dependencies
node_modules/

# Environment variables
.env
backend/.env
frontend/.env

# Build output
frontend/dist/

# Database
*.db
*.db-wal
*.db-shm

# Uploads
backend/uploads/*
!backend/uploads/.gitkeep

# Logs
*.log
```

---

## License

MIT — do whatever you want with it.

---

*Built by Hugo Mazzei · Mazha Garage*
