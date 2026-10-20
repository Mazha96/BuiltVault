// db.js against a populated copy of the production schema: no errors, idempotent, no data loss,
// new columns get their defaults on existing rows, and the app boots on it.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const Database = require('better-sqlite3');

const backend = path.join(__dirname, '..');

function prodCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-rvmig-'));
  const file = path.join(dir, 'prod.db');
  const d = new Database(file);
  d.exec(fs.readFileSync(path.join(__dirname, 'fixtures/prod-schema.sql'), 'utf8'));
  d.exec(`
    INSERT INTO users (id,username,email,password_hash,display_name,role) VALUES ('user_m','mazha','m@e.com','clerk_managed','Mazha','supermod');
    INSERT INTO projects (id,user_id,title,is_public,tags,status) VALUES ('p1','user_m','Bust',1,'["a"]','complete');
    INSERT INTO inventory_parts (id,user_id,name,stock_qty,category) VALUES ('i1','user_m','ESP32',3,'mcu');
    INSERT INTO bom_items (id,project_id,part_id,name,qty) VALUES ('b1','p1','i1','ESP32',1);
    INSERT INTO tasks (id,project_id,title) VALUES ('t1','p1','wire');
    INSERT INTO posts (id,project_id,user_id,type) VALUES ('po1','p1','user_m','manual');
    INSERT INTO post_comments (id,post_id,user_id,comment) VALUES ('c1','po1','user_m','hi');
    INSERT INTO activity_log (id,actor_id,project_id,type) VALUES ('a1','user_m','p1','x');
    INSERT INTO community_posts (id,user_id,title,body,project_id) VALUES ('cp1','user_m','t','b','p1');
    INSERT INTO notifications (id,user_id,type) VALUES ('n1','user_m','x');
    INSERT INTO time_logs (id,project_id,user_id,duration_minutes,logged_at) VALUES ('tl1','p1','user_m',30,'2026-10-01T00:00:00Z');
    INSERT INTO achievements (id,user_id,project_id,type,milestone) VALUES ('ac1','user_m','p1','streak',3);
  `);
  d.close();
  return file;
}

const runDb = (file) => execFileSync(process.execPath, ['-e', "require('./db')"], { cwd: backend, env: { ...process.env, DB_PATH: file } });

test('covers: migration on populated prod schema is idempotent and lossless', () => {
  const file = prodCopy();
  const count = (d) => Object.fromEntries(d.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    .map(t => [t.name, d.prepare(`SELECT COUNT(*) c FROM "${t.name}"`).get().c]));
  const before = count(new Database(file, { readonly: true }));
  runDb(file); runDb(file); runDb(file);
  const d = new Database(file, { readonly: true });
  assert.deepEqual(count(d), before);
  const u = d.prepare("SELECT * FROM users WHERE id='user_m'").get();
  assert.equal(u.role, 'supermod');
  assert.equal(u.headline, '');
  assert.equal(u.github_url, '');
  const p = d.prepare("SELECT * FROM projects WHERE id='p1'").get();
  assert.equal(p.tags, '["a"]');
  assert.equal(p.is_featured, 0);
  assert.equal(p.featured_order, 0);
  assert.equal(p.repo_url, '');
  assert.equal(p.demo_url, '');
  assert.equal(d.prepare("SELECT category FROM inventory_parts WHERE id='i1'").get().category, 'mcu');
  for (const idx of ['idx_posts_project', 'idx_activity_project', 'idx_tasks_project', 'idx_bom_project', 'idx_notif_user']) {
    assert.ok(d.prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name=?").get(idx), idx);
  }
  assert.deepEqual(d.pragma('integrity_check'), [{ integrity_check: 'ok' }]);
  assert.deepEqual(d.pragma('foreign_key_check'), []);
});

test('covers: the full app boots and serves reads on the migrated prod schema', () => {
  const file = prodCopy();
  const script = `
    process.env.DB_PATH = ${JSON.stringify(file)};
    const setupDb = require('./db'); // migrate first
    const Module = require('module'); const real = Module._load;
    Module._load = function (r) {
      if (r === '@clerk/express') return { verifyToken: async () => { throw new Error('x'); } };
      if (r === '@clerk/clerk-sdk-node') return { users: {} };
      return real.apply(this, arguments);
    };
    const app = require('./index');
    const request = require('supertest');
    (async () => {
      const out = {};
      for (const u of ['/api/projects/public', '/api/users/mazha', '/api/projects/p1', '/api/posts/po1', '/api/posts/po1/comments', '/api/timelogs/p1/public']) {
        const r = await request(app).get(u); out[u] = r.status;
      }
      console.log(JSON.stringify(out));
    })();`;
  const out = JSON.parse(execFileSync(process.execPath, ['-e', script], { cwd: backend, env: { ...process.env } }).toString().trim().split('\n').pop());
  for (const [u, s] of Object.entries(out)) assert.equal(s, 200, u);
});
