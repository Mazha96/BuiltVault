const Database = require('better-sqlite3');
const path = require('path');
const { DB_PATH } = require('./lib/paths');

const db = new Database(DB_PATH);

db.exec(`
  PRAGMA journal_mode=WAL;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    recovery_question TEXT DEFAULT '',
    recovery_answer_hash TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    display_name TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'draft',
    is_public INTEGER DEFAULT 0,
    category TEXT DEFAULT 'general',
    cover_url TEXT DEFAULT '',
    total_cost REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS inventory_parts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    unit TEXT DEFAULT 'pcs',
    stock_qty REAL DEFAULT 0,
    unit_cost REAL DEFAULT 0,
    supplier TEXT DEFAULT '',
    supplier_url TEXT DEFAULT '',
    is_3d_printed INTEGER DEFAULT 0,
    filament_type TEXT DEFAULT '',
    filament_grams REAL DEFAULT 0,
    filament_cost_per_kg REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS bom_items (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    part_id TEXT,
    name TEXT NOT NULL,
    qty REAL DEFAULT 1,
    unit TEXT DEFAULT 'pcs',
    unit_cost REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    supplier TEXT DEFAULT '',
    supplier_url TEXT DEFAULT '',
    is_3d_printed INTEGER DEFAULT 0,
    filament_type TEXT DEFAULT '',
    filament_grams REAL DEFAULT 0,
    filament_cost_per_kg REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (part_id) REFERENCES inventory_parts(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    is_done INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS project_files (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT DEFAULT 'other',
    file_size INTEGER DEFAULT 0,
    url TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS follows_users (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id),
    FOREIGN KEY (following_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS follows_projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (user_id, project_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    project_id TEXT,
    type TEXT NOT NULL,
    data TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (actor_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT DEFAULT '{}',
    caption TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS post_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS points_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    points INTEGER NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE INDEX IF NOT EXISTS idx_points_user_date ON points_transactions(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_points_project ON points_transactions(project_id);
`);

// ---------------------------------------------------------------------------
// Tables that were created on the live server but never added to this file.
// Definitions match the production schema (dumped 2026-10-20).
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS community_posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    project_id TEXT DEFAULT NULL,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    images TEXT DEFAULT '[]',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS community_replies (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    images TEXT DEFAULT '[]',
    FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT DEFAULT '{}',
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);

  CREATE TABLE IF NOT EXISTS time_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    notes TEXT DEFAULT '',
    logged_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    focus_session INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,
    milestone INTEGER,
    unlocked_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_posts_project ON posts(project_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_log(project_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
  CREATE INDEX IF NOT EXISTS idx_bom_project ON bom_items(project_id);
`);

// Add a column only if it is missing, so this file is safe to run against both a fresh
// database and the existing production one.
function addColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

// Columns added on the server over time
addColumn('users', 'role', "TEXT DEFAULT 'user'");
addColumn('projects', 'tags', "TEXT DEFAULT '[]'");
addColumn('inventory_parts', 'source', "TEXT DEFAULT 'manual'");
addColumn('inventory_parts', 'order_date', 'TEXT');
addColumn('inventory_parts', 'order_id', 'TEXT');
addColumn('inventory_parts', 'category', "TEXT DEFAULT 'other'");
addColumn('inventory_parts', 'subcategory', 'TEXT');
addColumn('inventory_parts', 'import_status', "TEXT DEFAULT 'confirmed'");

// Portfolio profile fields
addColumn('users', 'headline', "TEXT DEFAULT ''");
addColumn('users', 'location', "TEXT DEFAULT ''");
addColumn('users', 'github_url', "TEXT DEFAULT ''");
addColumn('users', 'website_url', "TEXT DEFAULT ''");
addColumn('users', 'resume_url', "TEXT DEFAULT ''");
addColumn('users', 'linkedin_url', "TEXT DEFAULT ''");

// How much of each BOM line was actually taken from inventory when the project was completed
addColumn('bom_items', 'deducted_qty', 'REAL DEFAULT 0');
// 1 once a completion was recorded with deducted_qty. Projects completed by the older code have 0,
// so reopening them restores the full BOM qty, which is what the old code took out.
addColumn('projects', 'stock_ledger', 'INTEGER DEFAULT 0');

// Proof links on each project
addColumn('projects', 'repo_url', "TEXT DEFAULT ''");
addColumn('projects', 'demo_url', "TEXT DEFAULT ''");

// Featured (pinned) projects on the public profile
addColumn('projects', 'is_featured', 'INTEGER DEFAULT 0');
addColumn('projects', 'featured_order', 'INTEGER DEFAULT 0');

module.exports = db;
