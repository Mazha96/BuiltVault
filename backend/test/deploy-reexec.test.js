// When git pull updates deploy.sh, the running (old) copy must hand over to the new one.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'init.defaultBranch=main', ...a], { cwd, stdio: 'pipe' }).toString();

test('deploy.sh re-runs itself after the pull updates it', () => {
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-reexec-'));
  const origin = path.join(T, 'o.git'), work = path.join(T, 'w'), repo = path.join(T, 'r');
  fs.mkdirSync(origin); git(origin, 'init', '--bare', '-q'); git(T, 'clone', '-q', origin, work);
  const real = fs.readFileSync(path.join(__dirname, '..', '..', 'deploy.sh'), 'utf8').replace(/^REPO=.*$/m, `REPO="${repo}"`);
  // v1: same script but marked OLD; v2: the real one marked NEW
  fs.writeFileSync(path.join(work, 'deploy.sh'), real.replace('set -euo pipefail', 'set -euo pipefail\necho "RUNNING-OLD"'), { mode: 0o755 });
  for (const d of ['frontend', 'backend']) { fs.mkdirSync(path.join(work, d)); fs.writeFileSync(path.join(work, d, '.keep'), ''); }
  git(work, 'add', '-A'); git(work, 'commit', '-qm', 'v1'); git(work, 'push', '-q', 'origin', 'HEAD:main');
  git(T, 'clone', '-q', '-b', 'main', origin, repo);
  fs.writeFileSync(path.join(work, 'deploy.sh'), real.replace('set -euo pipefail', 'set -euo pipefail\necho "RUNNING-NEW"'), { mode: 0o755 });
  git(work, 'add', '-A'); git(work, 'commit', '-qm', 'v2'); git(work, 'push', '-q', 'origin', 'HEAD:main');
  const v2 = git(work, 'rev-parse', 'HEAD').trim();

  const bin = path.join(T, 'bin'); fs.mkdirSync(bin);
  const stub = (n, body) => fs.writeFileSync(path.join(bin, n), `#!/bin/bash\n${body}\n`, { mode: 0o755 });
  for (const n of ['npm', 'sleep', 'ss', 'systemctl']) stub(n, 'exit 0');
  stub('curl', `if [[ "$*" == *api/health* ]]; then echo '{"ok":true,"version":"${v2}"}'; fi; exit 0`);

  const r = spawnSync('bash', [path.join(repo, 'deploy.sh')], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /RUNNING-OLD[\s\S]*re-running the new version[\s\S]*RUNNING-NEW[\s\S]*Done!/);
});
