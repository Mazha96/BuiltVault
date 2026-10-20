// The portfolio seed script: dry run changes nothing; apply creates private drafts, updates
// the existing BuildVault project, hides off-topic projects; re-running doesn't duplicate.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

test('seed-portfolio: dry run, apply, idempotent re-run, publish', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-seed-'));
  const env = { ...process.env, DB_PATH: path.join(dir, 'db.sqlite'), UPLOAD_DIR: path.join(dir, 'up') };
  const run = (...a) => execFileSync(process.execPath, ['scripts/seed-portfolio.js', ...a], { cwd: path.join(__dirname, '..'), env }).toString();
  const Database = require('better-sqlite3');
  execFileSync(process.execPath, ['-e', "require('./db')"], { cwd: path.join(__dirname, '..'), env });
  const d = new Database(env.DB_PATH);
  d.prepare("INSERT INTO users (id,username,email,password_hash) VALUES ('user_m','mazha','m@e.com','x')").run();
  d.prepare("INSERT INTO projects (id,user_id,title,is_public) VALUES ('p_bv','user_m','BuiltVault',1),('p_it','user_m','Learning Italian',1)").run();
  d.close();

  assert.match(run('mazha'), /Dry run only/);
  const q = (sql) => { const x = new Database(env.DB_PATH, { readonly: true }); const r = x.prepare(sql).all(); x.close(); return r; };
  assert.equal(q('SELECT COUNT(*) c FROM projects')[0].c, 2, 'dry run wrote nothing');

  run('mazha', '--apply');
  const projects = q('SELECT * FROM projects ORDER BY title');
  assert.equal(projects.length, 8); // 2 existing + 6 new (BuildVault reused)
  assert.equal(q("SELECT is_public FROM projects WHERE id='p_it'")[0].is_public, 0, 'off-topic hidden');
  const bv = q("SELECT * FROM projects WHERE id='p_bv'")[0];
  assert.equal(bv.title, 'BuildVault: Maker Project Hub');
  assert.equal(bv.is_public, 1, 'existing public project stays public');
  assert.ok(q("SELECT * FROM projects WHERE title LIKE 'Park Shift%'")[0].cover_url.startsWith('/uploads/'));
  assert.equal(q("SELECT COUNT(*) c FROM projects WHERE is_public=1")[0].c, 1, 'new projects are private drafts');
  const tasks = q('SELECT COUNT(*) c FROM tasks')[0].c;
  assert.ok(fs.readdirSync(env.UPLOAD_DIR).length >= 7);
  assert.ok(fs.readdirSync(path.join(dir, 'db_backups')).length >= 1);

  run('mazha', '--apply');
  assert.equal(q('SELECT COUNT(*) c FROM projects')[0].c, 8, 'no duplicate projects');
  assert.equal(q('SELECT COUNT(*) c FROM tasks')[0].c, tasks, 'no duplicate tasks');
  assert.equal(q('SELECT COUNT(*) c FROM posts')[0].c, 5, 'one update each for the 5 projects that have one');

  run('mazha', '--publish');
  assert.equal(q("SELECT COUNT(*) c FROM projects WHERE is_public=1")[0].c, 7);
  assert.equal(q("SELECT COUNT(*) c FROM projects WHERE is_featured=1")[0].c, 6);
});
