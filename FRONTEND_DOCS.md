# BuildVault — Frontend Documentation

## Overview

BuildVault's frontend is a **React Single Page Application (SPA)** built with **Vite** and styled entirely with **inline styles** (no Tailwind utility classes in JSX). Authentication is handled by **Clerk**. The compiled output lives in `frontend/dist/` and is served by the Express backend as static files.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build tool | Vite 7 |
| Routing | React Router v7 |
| Auth | Clerk (`@clerk/clerk-react`) |
| HTTP client | Axios |
| Icons | Lucide React |
| Styling | Inline styles + custom CSS classes in `index.css` |

---

## File Structure

```
buildvault/frontend/
├── .env                        ← Vite env vars (Clerk publishable key)
├── index.html                  ← HTML shell, mounts React at <div id="root">
├── vite.config.js              ← Vite config
├── dist/                       ← Built output (served by backend)
└── src/
    ├── main.jsx                ← App entry point, routing, Clerk setup
    ├── App.jsx                 ← (legacy Vite default, not used)
    ├── api.js                  ← Axios instance with auto Clerk token
    ├── index.css               ← Global styles + custom CSS classes
    ├── App.css                 ← (legacy, minimal)
    ├── context/
    │   └── AuthContext.jsx     ← Thin wrapper around Clerk hooks
    ├── components/
    │   └── Navbar.jsx          ← Top navigation bar
    └── pages/
        ├── Home.jsx            ← Landing page (public)
        ├── SignInPage.jsx      ← Clerk <SignIn /> component
        ├── SignUpPage.jsx      ← Clerk <SignUp /> component
        ├── Dashboard.jsx       ← My projects (protected)
        ├── ProjectDetail.jsx   ← Single project view/edit (protected)
        ├── Explore.jsx         ← Public project gallery
        ├── Inventory.jsx       ← Global parts inventory (protected)
        ├── Auth.jsx            ← (legacy pre-Clerk, not used in routing)
        └── ForgotPassword.jsx  ← (legacy pre-Clerk, not used in routing)
```

---

## Environment Variables (`.env`)

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Vite exposes any variable prefixed with `VITE_` to the browser via `import.meta.env`. Never put secrets here — this file is bundled into the JavaScript that users download.

---

## How the App Boots (`main.jsx`)

This is the entry point. React mounts here. The order matters:

```
ReactDOM.createRoot(...)
  └── <ClerkProvider>        ← Wraps everything, provides auth context
        └── <BrowserRouter>  ← Enables client-side URL routing
              └── <Navbar>   ← Always visible at top
              └── <Routes>   ← Switches which page component renders
```

### Route Table

| URL | Component | Protected? | Notes |
|---|---|---|---|
| `/` | `Home` | ❌ | Landing page |
| `/sign-in/*` | `SignInPage` | ❌ | Clerk hosted sign-in |
| `/sign-up/*` | `SignUpPage` | ❌ | Clerk hosted sign-up |
| `/explore` | `Explore` | ❌ | Public gallery, anyone can browse |
| `/projects/:id` | `ProjectDetail` | ❌* | Public projects visible to all |
| `/dashboard` | `Dashboard` | ✅ | Redirects to `/sign-in` if not logged in |
| `/inventory` | `Inventory` | ✅ | Redirects to `/sign-in` if not logged in |
| `/login` | → `/sign-in` | — | Legacy redirect |
| `/register` | → `/sign-up` | — | Legacy redirect |

> *`ProjectDetail` is technically public but only shows edit controls if you're the owner.

### The `Protected` Component
```jsx
function Protected({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>          // render if logged in
      <SignedOut><RedirectToSignIn /></SignedOut> // redirect if not
    </>
  );
}
```
Wraps any route that requires login. Uses Clerk's `<SignedIn>` and `<SignedOut>` components which react instantly to auth state.

---

## API Client (`api.js`)

All backend communication goes through a single **Axios instance**:

```js
const api = axios.create({
  baseURL: `${window.location.protocol}//${window.location.hostname}:3001/api`
});
```

The base URL is built dynamically from the current browser hostname — this means the app works on any server without hardcoding an IP address.

### Auto Token Injection
Every outgoing request automatically gets a Clerk JWT attached:

```js
api.interceptors.request.use(async cfg => {
  const token = await getClerkToken(); // waits up to 3s for Clerk to load
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
```

`getClerkToken()` polls `window.Clerk.session.getToken()` every 100ms for up to 3 seconds. This handles the race condition where a page loads and makes an API call before Clerk has finished initializing.

**Usage in any component:**
```js
import api from '../api';

// GET request
const response = await api.get('/projects');

// POST request
const response = await api.post('/projects', { title: 'My Build' });

// With file upload
const formData = new FormData();
formData.append('file', file);
await api.post(`/files/${projectId}`, formData);
```

---

## Authentication (`context/AuthContext.jsx`)

After migrating to Clerk, this file is now a **thin compatibility wrapper**. It exists so older components that `import { useAuth } from '../context/AuthContext'` still work without changes.

```js
export function useAuth() {
  const { user, isLoaded } = useUser();    // Clerk hook
  const { signOut, getToken } = useClerkAuth(); // Clerk hook

  return {
    user: {
      id: user.id,           // Clerk user ID (e.g. "user_2abc...")
      username: ...,         // From Clerk profile
      email: ...,
      avatar_url: ...,
    },
    loading: !isLoaded,      // true while Clerk is initializing
    logout: () => signOut(),
    getToken,
  };
}
```

**What `isOwner` means in ProjectDetail:**
```js
const isOwner = user && project && String(user.id) === String(project.user_id);
```
This checks if the logged-in Clerk user ID matches the `user_id` stored in the project's DB record. `String()` is used on both sides to prevent type mismatch bugs (int vs string).

---

## Styling System

BuildVault uses **two styling approaches** side by side:

### 1. Inline Styles (primary — used in all JSX)
All layout, color, spacing, and component styles are written as JavaScript objects:
```jsx
const s = {
  card: {
    background: '#0d1224',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '1.25rem',
  }
};

// Used as:
<div style={s.card}>...</div>
```

Dynamic styles use functions:
```jsx
progressFill: (pct) => ({
  width: `${pct}%`,
  background: 'linear-gradient(90deg, #00d4ff, #ff2d78)'
})

// Used as:
<div style={s.progressFill(project.progress)} />
```

### 2. Custom CSS Classes (secondary — defined in `index.css`)
A small set of reusable classes for things like scrollbars, neon text effects, and global resets. These are **not** Tailwind utility classes.

```css
/* Examples from index.css */
.neon-blue  { color: #00d4ff; }
.neon-pink  { color: #ff2d78; }
.neon-line  { height: 1px; background: linear-gradient(...); }
```

> ⚠️ **Important:** Tailwind utility class names like `flex`, `text-sm`, `bg-gray-900` do **NOT** work in JSX. BuildVault uses Tailwind v4 which requires `@theme {}` variables and processes CSS — it does not inject utility classes into JSX. Always use inline styles for component styling.

### Color Palette
```
Background:    #0a0e1a  (deep navy, used for page bg)
Card bg:       #0d1224  (slightly lighter, used for cards)
Deep navy:     #060d2e  (darkest, used for tab bars)
Neon blue:     #00d4ff  (primary accent — links, values, highlights)
Neon pink:     #ff2d78  (secondary accent — costs, warnings, actions)
Text:          #e2e8f0  (light gray, main text)
Muted:         #9ca3af  (labels, secondary text)
Dim:           #6b7280  (timestamps, hints)
```

---

## Components

### `Navbar.jsx`
Persistent top bar on all pages. Uses Clerk components directly:
- `<SignedIn>` — shows Dashboard, Inventory links + `<UserButton>` (Clerk's avatar/logout dropdown)
- `<SignedOut>` — shows Login and Sign Up buttons
- `<UserButton>` — Clerk's pre-built profile button with logout, manage account

---

## Pages

### `Home.jsx` — Landing Page
- Public, no auth required
- Marketing/hero page explaining BuildVault
- Links to `/explore` and `/sign-up`

### `SignInPage.jsx` / `SignUpPage.jsx`
- Thin wrappers around Clerk's `<SignIn>` and `<SignUp>` components
- Styled with BuildVault's dark theme via Clerk's `appearance` prop:
```js
appearance={{
  variables: {
    colorPrimary: '#00d4ff',
    colorBackground: '#0d1224',
    colorText: '#e2e8f0',
  }
}}
```
- Clerk handles all form logic, validation, Google OAuth, email verification

### `Dashboard.jsx` — My Projects
**State:** `projects[]`, `showNew` (modal toggle), `form` (new project fields), `submitting`, `error`

**On mount:** `GET /api/projects` → loads user's projects

**Create project flow:**
1. User clicks "New Project" → modal opens
2. Fills title, description, category, status, public toggle
3. `POST /api/projects` → on success, navigates to `/projects/:id`
4. Error displayed inline in modal if request fails

**Delete project:** `DELETE /api/projects/:id` → removes from local state immediately

### `ProjectDetail.jsx` — Single Project View
The most complex page. Has 4 tabs: Overview, BOM, Tasks, Files.

**State:**
```
project          ← full project object (includes bom[], tasks[], files[])
loading, error
tab              ← 'overview' | 'bom' | 'tasks' | 'files'
editTitle        ← toggle inline title editing
newTask          ← { title, category } for add task form
newBom           ← { name, qty, unit_cost, is_3d_printed, ... } for add BOM form
uploading        ← boolean for file upload state
```

**`load()` function:** Called after every mutation to refresh project data from server. Pattern: mutate → `load()` → React re-renders with fresh data.

**isOwner check:** Controls visibility of all edit/delete/add controls. Non-owners see read-only view.

**BOM tab:**
- Lists all parts with cost
- 3D printed toggle switches between qty×cost and filament formula
- Add form always visible to owner at bottom

**Tasks tab:**
- Grouped by category (general, design, sourcing, build, testing, done)
- Click checkbox to toggle done (owner only)
- Delete button per task (owner only)
- Add form at bottom (owner only)

**Files tab:**
- Lists uploaded files with download links
- Upload zone — click to trigger file input
- Auto-detects file type from extension
- 50MB max

### `Explore.jsx` — Public Gallery
**State:** `projects[]`, `search`, `category`, `view` ('grid'|'top10'), `sortBy`

**Filtering:** All done client-side after a single `GET /api/projects/public` fetch

**Category tabs:** all, electronics, 3d-printing, woodworking, metalwork, software, art, other, general

**Sort options:**
- Most Recent — default API order
- Highest Cost — sort by `total_cost` descending
- Most Complete — sort by `progress` descending

**Views:**
- Grid — card layout with cover image, category tag, progress bar
- Top 10 — ranked list with gold/silver/bronze for top 3

### `Inventory.jsx` — Parts Library
**State:** `parts[]`, `showForm`, `form`, `expanded{}`, `editing{}`, `search`, `filter`

**Stats bar:** Total parts, low/out-of-stock count, total inventory value (stock_qty × unit_cost)

**Per-part display:**
- Available qty = stock - committed to active projects
- Red border + warning icon if available ≤ 2
- Expand chevron → shows unit cost, total value, filament type, supplier link

**Inline qty edit:** Click pencil icon → input appears in place → save/cancel buttons

**Filters:** All / Low Stock / 3D Printed

---

## Data Flow (Request Lifecycle)

Here's what happens when you add a BOM item, end-to-end:

```
1. User fills form in ProjectDetail → clicks "Add to BOM"
2. addBom() calls api.post(`/projects/${id}/bom`, newBomData)
3. api.js interceptor fires:
   - Calls window.Clerk.session.getToken()
   - Attaches Authorization: Bearer <jwt> header
4. Request hits Express backend at POST /api/projects/:id/bom
5. auth middleware:
   - Verifies JWT with Clerk
   - Upserts user into local DB if needed
   - Sets req.user = { id: clerkUserId }
6. Route handler:
   - Validates project ownership
   - Calculates total_cost for the item
   - INSERTs into bom_items
   - Calls recalcCost() → UPDATEs projects.total_cost
   - Returns new BOM item as JSON
7. Frontend receives response
8. load() is called → GET /api/projects/:id refetches full project
9. setProject(r.data) → React re-renders with updated BOM list and total cost
```

---

## Build & Deploy

```bash
# Development (with hot reload)
cd frontend
npm run dev        # Vite dev server on port 5173
# Note: in dev mode, API calls still go to :3001 (backend must be running)

# Production build
npm run build      # Outputs to frontend/dist/
# Backend serves dist/ automatically — no separate web server needed
```

The build output is ~400KB JS (gzipped: ~122KB) + ~17KB CSS.

---

## Known Issues / Legacy Files

| File | Status | Notes |
|---|---|---|
| `App.jsx` | 🟡 Unused | Default Vite template, not imported anywhere in routing |
| `App.css` | 🟡 Minimal | Only imported by App.jsx, has no effect on the app |
| `pages/Auth.jsx` | 🟡 Legacy | Pre-Clerk login/register forms. Not in routing, kept as reference |
| `pages/ForgotPassword.jsx` | 🟡 Legacy | Pre-Clerk password recovery. Not in routing |

These files can be safely deleted — they're just taking up space from the original custom auth system before Clerk was integrated.

---

## Quick Reference — Adding a New Page

1. Create `src/pages/MyPage.jsx`
2. Add route in `main.jsx`:
   ```jsx
   import MyPage from './pages/MyPage';
   // inside <Routes>:
   <Route path="/my-page" element={<Protected><MyPage /></Protected>} />
   ```
3. Add nav link in `Navbar.jsx` if needed
4. Use `api` for data fetching:
   ```jsx
   import api from '../api';
   const { data } = await api.get('/some-endpoint');
   ```
5. Use `useAuth()` if you need the current user:
   ```jsx
   import { useAuth } from '../context/AuthContext';
   const { user, loading } = useAuth();
   ```
