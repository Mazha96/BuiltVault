// db.js must upgrade the real production schema in place without errors and without losing columns.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

test('db.js migrates a copy of the production schema', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-mig-'));
  const dbPath = path.join(dir, 'prod.db');
  const Database = require('better-sqlite3');
  const d = new Database(dbPath);
  d.exec(fs.readFileSync(path.join(__dirname, 'fixtures/prod-schema.sql'), 'utf8'));
  d.prepare("INSERT INTO users (id, username, email, password_hash) VALUES ('user_x','x','x@e.com','clerk_managed')").run();
  d.close();
  // Run db.js in a child process twice (idempotent) against that file.
  for (let i = 0; i < 2; i++) {
    execFileSync(process.execPath, ['-e', "require('./db')"], { cwd: path.join(__dirname, '..'), env: { ...process.env, DB_PATH: dbPath } });
  }
  const after = new Database(dbPath, { readonly: true });
  const cols = (t) => after.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);
  for (const c of ['headline', 'location', 'github_url', 'website_url', 'resume_url', 'linkedin_url', 'role', 'display_name']) assert.ok(cols('users').includes(c), c);
  for (const c of ['is_featured', 'featured_order', 'tags']) assert.ok(cols('projects').includes(c), c);
  assert.equal(after.prepare("SELECT username FROM users WHERE id='user_x'").get().username, 'x');
});
