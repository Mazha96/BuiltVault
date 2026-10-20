// The app is moving to a systemd service. Paths must not depend on the process working directory,
// or a unit without WorkingDirectory=.../backend silently opens a brand-new empty database.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

test('(fixed) default DB path is resolved from the process cwd, not from backend/', () => {
  const backend = path.join(__dirname, '..');
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-cwd-'));
  // Stub better-sqlite3 so nothing is opened or created: just record the path db.js asks for.
  const script = `
    const Module = require('module'); const real = Module._load;
    Module._load = function (r) {
      if (r === 'better-sqlite3') return function (p) { console.log('DBPATH=' + require('path').resolve(p));
        return { exec() {}, prepare: () => ({ all: () => [], get: () => undefined, run() {} }), pragma() {} }; };
      return real.apply(this, arguments);
    };
    require(${JSON.stringify(path.join(backend, 'db.js'))});`;
  const env = { ...process.env }; delete env.DB_PATH;
  const out = execFileSync(process.execPath, ['-e', script], { cwd, env }).toString();
  const opened = out.match(/DBPATH=(.*)/)[1].trim();
  assert.equal(opened, path.join(backend, 'buildvault.db'), `started from ${cwd}, db.js opened ${opened}`);
});
