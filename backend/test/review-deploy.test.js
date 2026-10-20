// Runs a copy of deploy.sh against a throwaway git repo with stubbed npm/systemctl/pm2/curl/sleep.
// Only REPO is rewritten; the script logic is the real one.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const DEPLOY = path.join(__dirname, '..', '..', 'deploy.sh');
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'init.defaultBranch=main', ...args], { cwd, stdio: 'pipe' }).toString();

function harness({ systemd, pm2Ok, extraFiles = 0, liveVersion = null }) {
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-deploy-'));
  const origin = path.join(T, 'origin.git');
  const work = path.join(T, 'work');
  const repo = path.join(T, 'repo');
  fs.mkdirSync(origin); git(origin, 'init', '--bare', '-q');
  git(T, 'clone', '-q', origin, work);
  for (const f of ['backend/package-lock.json', 'frontend/package-lock.json']) {
    fs.mkdirSync(path.dirname(path.join(work, f)), { recursive: true });
    fs.writeFileSync(path.join(work, f), '{}\n');
  }
  git(work, 'add', '-A'); git(work, 'commit', '-qm', 'v1'); git(work, 'push', '-q', 'origin', 'HEAD:main');
  git(T, 'clone', '-q', '-b', 'main', origin, repo);
  // New upstream commit: backend lockfile changes (+ optionally many other files).
  fs.writeFileSync(path.join(work, 'backend/package-lock.json'), '{"v":2}\n');
  if (extraFiles) {
    const d = path.join(work, 'backend/zz_assets');
    fs.mkdirSync(d);
    for (let i = 0; i < extraFiles; i++) fs.writeFileSync(path.join(d, `generated_asset_with_a_long_name_${i}.txt`), '');
  }
  git(work, 'add', '-A'); git(work, 'commit', '-qm', 'v2'); git(work, 'push', '-q', 'origin', 'HEAD:main');
  const v2 = git(work, 'rev-parse', 'HEAD').trim();

  const bin = path.join(T, 'bin'); fs.mkdirSync(bin);
  const log = path.join(T, 'calls.log');
  const stub = (name, body) => fs.writeFileSync(path.join(bin, name), `#!/bin/bash\necho "${name} $*" >> ${log}\n${body}\n`, { mode: 0o755 });
  stub('npm', 'exit 0');
  // The health endpoint reports the running commit; by default it's the one being deployed.
  stub('curl', `if [[ "$*" == *api/health* ]]; then echo '{"ok":true,"version":"${liveVersion || v2}"}'; fi; exit 0`);
  stub('ss', 'exit 0');
  stub('sleep', 'exit 0');
  stub('systemctl', systemd ? 'exit 0' : 'exit 1');
  stub('pm2', pm2Ok ? 'exit 0' : 'echo "[PM2][ERROR] Process or Namespace buildvault not found" >&2; exit 1');

  const script = path.join(T, 'deploy.sh');
  fs.writeFileSync(script, fs.readFileSync(DEPLOY, 'utf8').replace(/^REPO=.*$/m, `REPO="${repo}"`), { mode: 0o755 });
  const r = spawnSync('bash', [script], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, encoding: 'utf8' });
  return { ...r, calls: fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '', head: git(repo, 'rev-parse', 'HEAD').trim() };
}

test('covers: systemd path pulls, installs backend deps on lockfile change, builds, restarts, health-checks', () => {
  const r = harness({ systemd: true });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.calls, /npm ci --omit=dev/);
  assert.doesNotMatch(r.calls, /npm ci\n/, 'frontend lockfile unchanged, no frontend install');
  assert.match(r.calls, /npm run build/);
  assert.match(r.calls, /systemctl restart buildvault/);
  assert.match(r.calls, /curl .*127\.0\.0\.1:3001\/api\/health/);
});

test('no systemd unit: deploy refuses up front and changes nothing (fixed: used to die half-done)', () => {
  const r = harness({ systemd: false, pm2Ok: false });
  assert.notEqual(r.status, 0);
  assert.doesNotMatch(r.calls, /npm run build/, 'must not build before knowing it can restart');
  assert.match(r.stdout, /Nothing was changed/);
});

test('health check fails when the old process is still the one answering', () => {
  const r = harness({ systemd: true, liveVersion: 'old-sha' });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /roll back/i);
});

test('changed() under pipefail (fixed) misses a changed lockfile when the diff lists many files (grep -q SIGPIPE)', () => {
  const r = harness({ systemd: true, extraFiles: 4000 });
  assert.match(r.calls, /npm ci --omit=dev/, 'backend/package-lock.json changed but npm ci was skipped');
});
