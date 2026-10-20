// Independent review of 6c135dd..portfolio. Tests named "DEFECT:" fail on the reviewed code and
// pass once the defect is fixed. Tests named "covers:" pin behaviour the diff added.
const { test, before } = require('node:test');
const assert = require('node:assert');
const { app, db, request, as } = require('./setup');

const A = as('alice'), B = as('bob');
let pub, priv;

async function mk(user, body) {
  const r = await request(app).post('/api/projects').set(user).send(body);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.id;
}

before(async () => {
  pub = await mk(A, { title: 'Public one', is_public: 1 });
  priv = await mk(A, { title: 'Secret plans', is_public: 0 });
  await mk(B, { title: 'Bob public', is_public: 1 });
});

// ---------------------------------------------------------------- defects

test('(fixed) leaving "complete" must not add back parts that were never deducted', async () => {
  db.prepare("INSERT INTO inventory_parts (id,user_id,name,stock_qty) VALUES ('rv_part','user_alice','Servo',10)").run();
  const stock = () => db.prepare("SELECT stock_qty FROM inventory_parts WHERE id='rv_part'").get().stock_qty;
  const p = await mk(A, { title: 'inflate' });
  await request(app).put(`/api/projects/${p}`).set(A).send({ status: 'complete' }); // empty BOM, nothing deducted
  await request(app).post(`/api/projects/${p}/bom`).set(A).send({ name: 'Servo', qty: 4, part_id: 'rv_part' });
  await request(app).put(`/api/projects/${p}`).set(A).send({ status: 'in-progress' });
  assert.equal(stock(), 10, 'stock grew by parts that were never consumed');
});

test('(fixed) PATCH /users/me is not atomic (400 response but links/headline already saved)', async () => {
  const r = await request(app).patch('/api/users/me').set(A)
    .send({ headline: 'should not be saved', github_url: 'github.com/should-not-save', display_name: 'x' });
  assert.equal(r.status, 400);
  const u = db.prepare("SELECT headline, github_url FROM users WHERE id='user_alice'").get();
  assert.notEqual(u.headline, 'should not be saved');
  assert.notEqual(u.github_url, 'https://github.com/should-not-save');
});

test('(fixed) PUT /projects/:id is not atomic (repo_url saved although demo_url rejected)', async () => {
  const r = await request(app).put(`/api/projects/${pub}`).set(A)
    .send({ repo_url: 'https://github.com/x/partial', demo_url: 'javascript:alert(1)' });
  assert.equal(r.status, 400);
  assert.notEqual(db.prepare('SELECT repo_url FROM projects WHERE id=?').get(pub).repo_url, 'https://github.com/x/partial');
});

test("DEFECT: community post can link another user's private project and expose its title/cover", async () => {
  const c = await request(app).post('/api/community').set(B)
    .send({ title: 'look', body: 'b', category: 'general', project_id: priv });
  const list = await request(app).get('/api/community').set(B);
  const one = await request(app).get(`/api/community/${c.body.id || 'none'}`).set(B);
  const leaked = [...(list.body || []), one.body || {}].some(p => p && p.project_title === 'Secret plans');
  assert.ok(!leaked, 'private project title visible through community post');
});

test('(fixed) a failed Clerk getUser() fallback profile is cached for 10 minutes', async () => {
  const clerkUsers = require('@clerk/clerk-sdk-node').users; // same object the middleware captured
  const real = clerkUsers.getUser;
  try {
    clerkUsers.getUser = async () => { throw new Error('Clerk 503'); };
    await request(app).get('/api/users/me').set(as('carol'));        // falls back to token payload
    clerkUsers.getUser = async () => ({ username: 'carol_real', primaryEmailAddress: { emailAddress: 'carol@real.com' } });
    await request(app).get('/api/users/me').set(as('carol'));        // Clerk is back
    const u = db.prepare("SELECT username, email FROM users WHERE id='user_carol'").get();
    assert.equal(u.username, 'carol_real', 'fallback profile kept overwriting the user row after Clerk recovered');
  } finally { clerkUsers.getUser = real; }
});

test('(fixed) /users/me lists a followed project after its owner made it private', async () => {
  const p = await mk(A, { title: 'Was public', is_public: 1 });
  await request(app).post(`/api/follow/projects/${p}`).set(B);
  await request(app).put(`/api/projects/${p}`).set(A).send({ is_public: 0 });
  const me = await request(app).get('/api/users/me').set(B);
  assert.ok(!me.body.followedProjects.some(x => x.title === 'Was public'), 'private project title leaked to follower');
});

// ---------------------------------------------------------------- coverage

test('covers: single post works signed out for public, 403 signed out for private, 404 unknown', async () => {
  db.prepare("INSERT INTO posts (id,project_id,user_id,type) VALUES ('rv_pub',?,'user_alice','manual')").run(pub);
  db.prepare("INSERT INTO posts (id,project_id,user_id,type) VALUES ('rv_priv',?,'user_alice','manual')").run(priv);
  assert.equal((await request(app).get('/api/posts/rv_pub')).status, 200);
  assert.equal((await request(app).get('/api/posts/rv_priv')).status, 403);
  assert.equal((await request(app).get('/api/posts/rv_priv').set(B)).status, 403);
  assert.equal((await request(app).get('/api/posts/rv_priv').set(A)).status, 200);
  assert.equal((await request(app).get('/api/posts/rv_priv/comments')).status, 403);
  assert.equal((await request(app).get('/api/posts/nope')).status, 404);
  assert.equal((await request(app).get(`/api/posts/history/${priv}`)).status, 403);
  assert.equal((await request(app).get(`/api/projects/${priv}/bom`)).status, 403);
});

test('covers: project owner can delete a visitor post; supermod can delete any post', async () => {
  db.prepare("INSERT INTO posts (id,project_id,user_id,type) VALUES ('rv_bobpost',?,'user_bob','manual')").run(pub);
  assert.equal((await request(app).delete('/api/posts/rv_bobpost').set(A)).status, 200);
  db.prepare("INSERT INTO posts (id,project_id,user_id,type) VALUES ('rv_modpost',?,'user_alice','manual')").run(pub);
  await request(app).get('/api/users/me').set(as('mod'));
  db.prepare("UPDATE users SET role='supermod' WHERE id='user_mod'").run();
  assert.equal((await request(app).delete('/api/posts/rv_modpost').set(as('mod'))).status, 200);
});

test('covers: deleting a project with every kind of dependent row succeeds under FK enforcement', async () => {
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
  const p = await mk(A, { title: 'full delete', is_public: 1 });
  db.prepare("INSERT INTO posts (id,project_id,user_id,type) VALUES ('rv_fd',?,'user_alice','manual')").run(p);
  await request(app).post('/api/posts/rv_fd/comments').set(B).send({ comment: 'nice' });
  await request(app).post(`/api/follow/projects/${p}`).set(B);
  await request(app).post(`/api/projects/${p}/tasks`).set(A).send({ title: 't' });
  await request(app).post(`/api/projects/${p}/bom`).set(A).send({ name: 'x', part_id: 'rv_part' });
  await request(app).post(`/api/timelogs/${p}`).set(A).send({ duration_minutes: 5 });
  await request(app).post(`/api/points/${p}`).set(B).send({ amount: 1 });
  db.prepare("INSERT INTO activity_log (id,actor_id,project_id,type) VALUES ('rv_act','user_alice',?,'x')").run(p);
  const cp = await request(app).post('/api/community').set(A).send({ title: 't', body: 'b', category: 'general', project_id: p });
  const r = await request(app).delete(`/api/projects/${p}`).set(A);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(db.prepare('SELECT COUNT(*) c FROM projects WHERE id=?').get(p).c, 0);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM post_comments WHERE post_id='rv_fd'").get().c, 0);
  assert.equal(db.prepare('SELECT project_id FROM community_posts WHERE id=?').get(cp.body.id).project_id, null);
  assert.equal((await request(app).delete(`/api/projects/${pub}`).set(B)).status, 404, 'non-owner cannot delete');
});

test('covers: follow validation (unknown user 404, own private project allowed)', async () => {
  assert.equal((await request(app).post('/api/follow/users/user_ghost').set(B)).status, 404);
  assert.equal((await request(app).post(`/api/follow/projects/${priv}`).set(A)).status, 200);
  assert.equal((await request(app).post('/api/follow/projects/nope').set(B)).status, 404);
});

test('covers: time log validation (future date, >24h, fractional, owner-only delete)', async () => {
  const future = new Date(Date.now() + 3 * 86400000).toISOString();
  assert.equal((await request(app).post(`/api/timelogs/${pub}`).set(A).send({ duration_minutes: 10, logged_at: future })).status, 400);
  assert.equal((await request(app).post(`/api/timelogs/${pub}`).set(A).send({ duration_minutes: 1441 })).status, 400);
  assert.equal((await request(app).post(`/api/timelogs/${pub}`).set(A).send({ duration_minutes: 1.5 })).status, 400);
  const ok = await request(app).post(`/api/timelogs/${pub}`).set(A).send({ duration_minutes: 20, logged_at: '2026-10-01T12:00:00Z' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.log.logged_at, '2026-10-01T12:00:00.000Z');
  assert.equal((await request(app).delete(`/api/timelogs/${pub}/${ok.body.log.id}`).set(B)).status, 404);
});

test('covers: svg upload is served as a sandboxed attachment; images inline', async () => {
  const svg = await request(app).post(`/api/files/${pub}`).set(A).attach('file', Buffer.from('<svg onload="alert(1)"/>'), 'x.SVG');
  assert.equal(svg.body.file_type, 'blueprint');
  const s = await request(app).get(svg.body.url);
  assert.match(s.headers['content-disposition'] || '', /attachment/);
  const png = await request(app).post(`/api/files/${pub}`).set(A).attach('file', Buffer.from('x'), 'a.png');
  assert.equal((await request(app).get(png.body.url)).headers['content-disposition'], undefined);
});

test('covers: all legacy password routes return 410; malformed JSON returns JSON 400', async () => {
  for (const r of ['register', 'login', 'recovery-question', 'reset-password']) {
    assert.equal((await request(app).post(`/api/auth/${r}`).send({})).status, 410, r);
  }
  const bad = await request(app).post('/api/projects').set(A).set('Content-Type', 'application/json').send('{bad');
  assert.equal(bad.status, 400);
  assert.equal(typeof bad.body.error, 'string');
});

test('covers: profile link clearing with "" and public profile exposes links but not email', async () => {
  await request(app).patch('/api/users/me').set(B).send({ website_url: 'bob.dev', linkedin_url: 'https://linkedin.com/in/bob' });
  const cleared = await request(app).patch('/api/users/me').set(B).send({ website_url: '' });
  assert.equal(cleared.body.website_url, '');
  const pubProfile = await request(app).get('/api/users/user_bob');
  assert.equal(pubProfile.body.linkedin_url, 'https://linkedin.com/in/bob');
  assert.equal(pubProfile.body.email, undefined);
  assert.ok(pubProfile.body.projects.every(p => p.is_public === 1));
});

test('covers: BOM item edit cannot touch another project through own project id', async () => {
  const item = await request(app).post(`/api/projects/${pub}/bom`).set(A).send({ name: 'Alice part', qty: 1, unit_cost: 2 });
  const bobP = await mk(B, { title: 'bob bom' });
  const r = await request(app).put(`/api/projects/${bobP}/bom/${item.body.id}`).set(B).send({ name: 'pwned' });
  assert.equal(r.status, 404);
  assert.equal(db.prepare('SELECT name FROM bom_items WHERE id=?').get(item.body.id).name, 'Alice part');
});
