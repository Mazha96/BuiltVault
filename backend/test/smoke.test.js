const { test } = require('node:test');
const assert = require('node:assert');
const { app, request, as } = require('./setup');

test('health', async () => {
  const r = await request(app).get('/api/health');
  assert.equal(r.status, 200);
});

test('create project as alice and read it', async () => {
  const c = await request(app).post('/api/projects').set(as('alice')).send({ title: 'T1', is_public: 0 });
  assert.equal(c.status, 200, JSON.stringify(c.body));
  const own = await request(app).get(`/api/projects/${c.body.id}`).set(as('alice'));
  assert.equal(own.status, 200, JSON.stringify(own.body));
  const anon = await request(app).get(`/api/projects/${c.body.id}`);
  assert.equal(anon.status, 403);
});
