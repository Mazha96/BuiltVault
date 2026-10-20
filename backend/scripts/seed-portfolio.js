#!/usr/bin/env node
// One-time portfolio content loader for BuildVault.
//
//   node scripts/seed-portfolio.js mazha            # dry run: prints what would change
//   node scripts/seed-portfolio.js mazha --apply    # backs up the DB, then applies as PRIVATE drafts
//   node scripts/seed-portfolio.js mazha --publish  # after review: make the seeded projects public
//
// Content lives in scripts/portfolio/projects.json and covers in scripts/portfolio/covers/.
// Re-running is safe: projects are matched by title (or existing_title) and updated, not duplicated.
const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');
const { DB_PATH, UPLOAD_DIR } = require('../lib/paths');
const db = require('../db');

const [username, flag] = process.argv.slice(2);
const APPLY = flag === '--apply';
const PUBLISH = flag === '--publish';
if (!username) { console.error('Usage: node scripts/seed-portfolio.js <username> [--apply|--publish]'); process.exit(1); }

const user = db.prepare('SELECT id, username FROM users WHERE username=? COLLATE NOCASE').get(username);
if (!user) { console.error(`No user "${username}"`); process.exit(1); }

const content = JSON.parse(fs.readFileSync(path.join(__dirname, 'portfolio/projects.json'), 'utf8'));
// Off-topic projects Hugo chose to hide (made private, never deleted)
const HIDE = ['Learning Italian', 'Learn Autocad and 3d design', 'BuildVault & FunFund → GitHub Migration', 'Mazha Garage Instagram — 3D Print Home Series'];

const findProject = (title) => db.prepare('SELECT * FROM projects WHERE user_id=? AND TRIM(title)=TRIM(?)').get(user.id, title);

if (PUBLISH) {
  const backup = backupDb();
  let n = 0;
  for (const p of content) {
    const row = findProject(p.title);
    if (row && !row.is_public) { db.prepare("UPDATE projects SET is_public=1, updated_at=datetime('now') WHERE id=?").run(row.id); n++; console.log(`public: ${p.title}`); }
  }
  console.log(`Published ${n} project(s). Backup: ${backup}`);
  process.exit(0);
}

const plan = [];
for (const title of HIDE) {
  const row = findProject(title);
  if (row && row.is_public) plan.push({ kind: 'hide', row });
}
for (const p of content) {
  const row = findProject(p.title) || (p.existing_title && findProject(p.existing_title));
  plan.push({ kind: row ? 'update' : 'create', p, row });
}

for (const step of plan) {
  if (step.kind === 'hide') console.log(`make private: ${step.row.title}`);
  else console.log(`${step.kind}: ${step.p.title}${step.row && step.row.title !== step.p.title ? ` (was "${step.row.title}")` : ''} | ${step.p.tasks.length} tasks | cover ${step.p.key}.jpg | featured=${step.p.featured}`);
}
if (!APPLY) { console.log('\nDry run only. Add --apply to write these changes (as private drafts).'); process.exit(0); }

const backup = backupDb();
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

db.transaction(() => {
  for (const step of plan) {
    if (step.kind === 'hide') { db.prepare('UPDATE projects SET is_public=0, is_featured=0 WHERE id=?').run(step.row.id); continue; }
    const p = step.p;
    let id = step.row?.id;
    if (!id) {
      id = uuid();
      db.prepare(`INSERT INTO projects (id, user_id, title, description, status, is_public, category, tags) VALUES (?,?,?,?,?,0,?,?)`)
        .run(id, user.id, p.title, p.description, p.status, p.category, JSON.stringify(p.tags));
    } else {
      // Existing public projects keep their visibility; new text replaces the old.
      db.prepare(`UPDATE projects SET title=?, description=?, status=?, category=?, tags=?, updated_at=datetime('now') WHERE id=?`)
        .run(p.title, p.description, p.status, p.category, JSON.stringify(p.tags), id);
    }
    db.prepare('UPDATE projects SET repo_url=?, demo_url=?, is_featured=?, featured_order=? WHERE id=?')
      .run(p.repo_url || '', p.demo_url || '', p.featured ? 1 : 0, p.order || 0, id);

    // Cover: copy the branded card into uploads (only if the project has no cover yet)
    const current = db.prepare('SELECT cover_url FROM projects WHERE id=?').get(id).cover_url;
    if (!current) {
      const name = `${uuid()}.jpg`;
      fs.copyFileSync(path.join(__dirname, 'portfolio/covers', `${p.key}.jpg`), path.join(UPLOAD_DIR, name));
      db.prepare('UPDATE projects SET cover_url=? WHERE id=?').run(`/uploads/${name}`, id);
    }

    // Tasks: add any that don't exist yet, set done state
    const existing = new Set(db.prepare('SELECT title FROM tasks WHERE project_id=?').all(id).map(t => t.title));
    let order = db.prepare('SELECT COALESCE(MAX(sort_order),0) m FROM tasks WHERE project_id=?').get(id).m;
    for (const [title, category, done] of p.tasks) {
      if (existing.has(title)) continue;
      db.prepare('INSERT INTO tasks (id, project_id, title, category, is_done, sort_order) VALUES (?,?,?,?,?,?)')
        .run(uuid(), id, title, category, done ? 1 : 0, ++order);
    }

    // One progress update, if there isn't one with the same caption already
    if (p.update && !db.prepare('SELECT 1 FROM posts WHERE project_id=? AND caption=?').get(id, p.update)) {
      db.prepare('INSERT INTO posts (id, project_id, user_id, type, data, caption) VALUES (?,?,?,?,?,?)')
        .run(uuid(), id, user.id, 'manual_update', '{}', p.update);
    }
  }
})();

console.log(`\nDone. New projects are PRIVATE drafts. Review them at https://mazhagarage.cloud/dashboard,`);
console.log(`then run: node scripts/seed-portfolio.js ${username} --publish`);
console.log(`Backup: ${backup}`);

function backupDb() {
  const dir = path.join(path.dirname(DB_PATH), 'db_backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `buildvault_before-seed_${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
  db.pragma('wal_checkpoint(TRUNCATE)'); // flush the WAL so the file copy is complete
  fs.copyFileSync(DB_PATH, file);
  return file;
}
