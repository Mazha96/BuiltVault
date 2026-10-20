CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    recovery_question TEXT DEFAULT '',
    recovery_answer_hash TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  , display_name TEXT DEFAULT '', role TEXT DEFAULT "user");
CREATE TABLE projects (
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
    updated_at TEXT DEFAULT (datetime('now')), tags TEXT DEFAULT "[]",
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
CREATE TABLE inventory_parts (
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
    created_at TEXT DEFAULT (datetime('now')), source TEXT DEFAULT 'manual', order_date TEXT, order_id TEXT, category TEXT DEFAULT 'other', subcategory TEXT, import_status TEXT DEFAULT 'confirmed',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
CREATE TABLE bom_items (
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
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    is_done INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
CREATE TABLE project_files (
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
CREATE TABLE follows_users (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id),
    FOREIGN KEY (following_id) REFERENCES users(id)
  );
CREATE TABLE follows_projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (user_id, project_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
CREATE TABLE activity_log (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    project_id TEXT,
    type TEXT NOT NULL,
    data TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (actor_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
CREATE TABLE posts (
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
CREATE TABLE post_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
CREATE TABLE points_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    points INTEGER NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
CREATE INDEX idx_points_user_date ON points_transactions(user_id, date);
CREATE INDEX idx_points_project ON points_transactions(project_id);
CREATE TABLE community_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  project_id TEXT DEFAULT NULL,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')), images TEXT DEFAULT "[]",
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE community_replies (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')), images TEXT DEFAULT "[]",
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT DEFAULT '{}',
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_notif_user ON notifications(user_id, is_read);
CREATE TABLE time_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    notes TEXT DEFAULT '',
    logged_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  , focus_session INTEGER DEFAULT 0);
CREATE TABLE achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,
    milestone INTEGER,
    unlocked_at TEXT DEFAULT (datetime('now'))
  );