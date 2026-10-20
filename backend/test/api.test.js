// Behaviour tests for the portfolio branch: visibility, ownership, and new profile features.
// Users: alice (owner), bob (other signed-in user), anonymous visitor.
const { test, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { app, db, request, as } = require('./setup');

const A = as('alice'), B = as('bob');
let pub, priv;

async function mk(user, body) {
  const r = await request(app).post('/api/projects').set(user).send(body);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.id;
}

before(async () => {
  pub = await mk(A, { title: 'Park Shift', is_public: 1, category: 'game' });
  priv = await mk(A, { title: 'Secret', is_public: 0 });
  await mk(B, { title: 'Bob thing', is_public: 1 }); // creates bob's user row
});

test('owner can open a private project; visitors and other users cannot', async () => {
  assert.equal((await request(app).get(`/api/projects/${priv}`).set(A)).status, 200);
  assert.equal((await request(app).get(`/api/projects/${priv}`).set(B)).status, 403);
  assert.equal((await request(app).get(`/api/projects/${priv}`)).status, 403);
  assert.equal((await request(app).get(`/api/projects/${pub}`)).status, 200);
});

test('private BOM is hidden; public BOM is readable signed out', async () => {
  assert.equal((await request(app).get(`/api/projects/${priv}/bom`).set(B)).status, 403);
  assert.equal((await request(app).get(`/api/projects/${pub}/bom`)).status, 200);
});

test("cannot edit another user's task through your own project id", async () => {
  const t = await request(app).post(`/api/projects/${priv}/tasks`).set(A).send({ title: 'alice task' });
  const bobProject = await mk(B, { title: 'bob p' });
  const r = await request(app).put(`/api/projects/${bobProject}/tasks/${t.body.id}`).set(B).send({ title: 'pwned' });
  assert.equal(r.status, 404);
  assert.equal(db.prepare('SELECT title FROM tasks WHERE id=?').get(t.body.id).title, 'alice task');
});

test("cannot attach someone else's inventory part to your BOM", async () => {
  db.prepare("INSERT INTO inventory_parts (id,user_id,name,stock_qty) VALUES ('part_a','user_alice','ESP32',5)").run();
  const bobProject = await mk(B, { title: 'bob p2' });
  const r = await request(app).post(`/api/projects/${bobProject}/bom`).set(B).send({ name: 'x', qty: 1e9, part_id: 'part_a' });
  assert.equal(r.status, 400);
});

test('toggling complete does not deduct inventory twice', async () => {
  const p = await mk(A, { title: 'inv test' });
  await request(app).post(`/api/projects/${p}/bom`).set(A).send({ name: 'ESP32', qty: 2, part_id: 'part_a' });
  const stock = () => db.prepare("SELECT stock_qty FROM inventory_parts WHERE id='part_a'").get().stock_qty;
  const s0 = stock();
  await request(app).put(`/api/projects/${p}`).set(A).send({ status: 'complete' });
  assert.equal(stock(), s0 - 2);
  await request(app).put(`/api/projects/${p}`).set(A).send({ status: 'in-progress' });
  await request(app).put(`/api/projects/${p}`).set(A).send({ status: 'complete' });
  assert.equal(stock(), s0 - 2);
});

test('BOM partial update keeps the cost', async () => {
  const p = await mk(A, { title: 'bom test' });
  const item = await request(app).post(`/api/projects/${p}/bom`).set(A).send({ name: 'Servo', qty: 3, unit_cost: 4 });
  const r = await request(app).put(`/api/projects/${p}/bom/${item.body.id}`).set(A).send({ notes: 'MG996R' });
  assert.equal(r.status, 200);
  assert.equal(r.body.total_cost, 12);
  assert.equal(r.body.notes, 'MG996R');
});

test('public profile works signed out, hides email and private projects, lists featured first', async () => {
  await request(app).put(`/api/projects/${pub}`).set(A).send({ is_featured: 1 });
  const r = await request(app).get('/api/users/alice');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.email, undefined);
  const titles = r.body.projects.map(p => p.title);
  assert.ok(!titles.includes('Secret'));
  assert.equal(r.body.projects[0].title, 'Park Shift');
  assert.equal((await request(app).get('/api/users/ALICE')).status, 200, 'username lookup is case-insensitive');
});

test('featured is capped at 6', async () => {
  const ids = [];
  for (let i = 0; i < 6; i++) ids.push(await mk(A, { title: `f${i}`, is_public: 1 }));
  let last;
  for (const id of ids) last = await request(app).put(`/api/projects/${id}`).set(A).send({ is_featured: 1 });
  assert.equal(last.status, 400); // pub + 5 = 6 already, the 6th new one is the 7th
});

test('profile links accept http(s) only', async () => {
  const ok = await request(app).patch('/api/users/me').set(A).send({ headline: 'Ride & Show Tech', github_url: 'github.com/Mazha96' });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.github_url, 'https://github.com/Mazha96');
  assert.equal(ok.body.headline, 'Ride & Show Tech');
  const bad = await request(app).patch('/api/users/me').set(A).send({ website_url: 'javascript:alert(1)' });
  assert.equal(bad.status, 400);
});

test('posts: visibility on single post and comments, delete by owner only', async () => {
  db.prepare("INSERT INTO posts (id,project_id,user_id,type,caption) VALUES ('post_pub',?, 'user_alice','manual','hi')").run(pub);
  db.prepare("INSERT INTO posts (id,project_id,user_id,type,caption) VALUES ('post_priv',?, 'user_alice','manual','secret')").run(priv);
  assert.equal((await request(app).get('/api/posts/post_pub/comments')).status, 200);
  assert.equal((await request(app).get('/api/posts/post_priv/comments').set(B)).status, 403);
  assert.equal((await request(app).post('/api/posts/post_priv/comments').set(B).send({ comment: 'x' })).status, 403);
  assert.equal((await request(app).delete('/api/posts/post_pub').set(B)).status, 403);
  assert.equal((await request(app).delete('/api/posts/post_pub').set(A)).status, 200);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM posts WHERE id='post_pub'").get().c, 0);
});

test('cannot follow a private project of another user', async () => {
  assert.equal((await request(app).post(`/api/follow/projects/${priv}`).set(B)).status, 403);
});

test('activity feed does not leak private projects', async () => {
  await request(app).post('/api/follow/users/user_alice').set(B);
  await request(app).post(`/api/projects/${priv}/tasks`).set(A).send({ title: 'hidden' });
  const t = await request(app).post(`/api/projects/${priv}/tasks`).set(A).send({ title: 'done hidden' });
  await request(app).put(`/api/projects/${priv}/tasks/${t.body.id}`).set(A).send({ is_done: true });
  const feed = await request(app).get('/api/follow/feed').set(B);
  assert.equal(feed.status, 200);
  assert.ok(!feed.body.some(e => e.project_id === priv), 'private activity leaked');
});

test('time logs: owner only, validated, public stats only for public projects', async () => {
  assert.equal((await request(app).post(`/api/timelogs/${pub}`).set(B).send({ duration_minutes: 30 })).status, 403);
  assert.equal((await request(app).post(`/api/timelogs/${pub}`).set(A).send({ duration_minutes: 30, logged_at: 123 })).status, 400);
  assert.equal((await request(app).post(`/api/timelogs/${pub}`).set(A).send({ duration_minutes: '30' })).status, 200);
  const s = await request(app).get(`/api/timelogs/${pub}/public`);
  assert.equal(s.status, 200);
  assert.equal(s.body.totalMinutes, 30);
  assert.equal((await request(app).get(`/api/timelogs/${priv}/public`)).status, 404);
});

test('uploads: html is never served inline; mp4 is detected as video', async () => {
  const up = await request(app).post(`/api/files/${pub}`).set(A).attach('file', Buffer.from('<script>alert(1)</script>'), 'evil.html');
  assert.equal(up.status, 200);
  const served = await request(app).get(up.body.url);
  assert.match(served.headers['content-disposition'] || '', /attachment/);
  assert.match(served.headers['content-security-policy'] || '', /sandbox/);
  assert.equal(served.headers['x-content-type-options'], 'nosniff');
  const vid = await request(app).post(`/api/files/${pub}`).set(A).attach('file', Buffer.from('fake'), 'demo.mp4');
  assert.equal(vid.body.file_type, 'video');
  const vs = await request(app).get(vid.body.url);
  assert.equal(vs.headers['content-disposition'], undefined);
});

test('community upload rejects non-images', async () => {
  const r = await request(app).post('/api/community/upload').set(A).attach('images', Buffer.from('<svg/>'), 'x.svg');
  assert.equal(r.status, 400);
});

test('legacy password routes are disabled', async () => {
  assert.equal((await request(app).post('/api/auth/register').send({ username: 'squat', email: 'a@b.c', password: 'x' })).status, 410);
});

test('deleting a project removes its posts, files rows and tasks', async () => {
  const p = await mk(A, { title: 'to delete', is_public: 1 });
  await request(app).post(`/api/projects/${p}/tasks`).set(A).send({ title: 't' });
  db.prepare("INSERT INTO posts (id,project_id,user_id,type) VALUES ('post_del',?,'user_alice','manual')").run(p);
  assert.equal((await request(app).delete(`/api/projects/${p}`).set(A)).status, 200);
  for (const t of ['posts', 'tasks']) assert.equal(db.prepare(`SELECT COUNT(*) c FROM ${t} WHERE project_id=?`).get(p).c, 0, t);
});

test('signed-out requests to auth-only routes get 401 JSON, not a crash', async () => {
  const r = await request(app).get('/api/projects');
  assert.equal(r.status, 401);
  assert.equal(r.body.detail, undefined, 'no internal error detail leaked');
});

test('project repo and demo links: http(s) only, returned publicly', async () => {
  const ok = await request(app).put(`/api/projects/${pub}`).set(A).send({ repo_url: 'github.com/Mazha96/ParkShift', demo_url: 'https://youtu.be/abc' });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  const r = await request(app).get(`/api/projects/${pub}`);
  assert.equal(r.body.repo_url, 'https://github.com/Mazha96/ParkShift');
  assert.equal(r.body.demo_url, 'https://youtu.be/abc');
  assert.equal((await request(app).put(`/api/projects/${pub}`).set(A).send({ demo_url: 'javascript:alert(1)' })).status, 400);
});
