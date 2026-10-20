const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR } = require('./lib/paths');

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      console.log(`[${new Date().toISOString()}] ${res.statusCode} ${req.method} ${req.path}`);
    }
  });
  next();
});
// Uploaded files are served from the same origin as the app, so anything a browser could
// execute (HTML, SVG, JS...) must never render inline: it would run with the site's cookies.
// Images, video and PDF display inline; everything else is a sandboxed download.
const INLINE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.mp4', '.webm', '.mov', '.m4v', '.pdf']);
app.use('/uploads', express.static(UPLOAD_DIR, {
  setHeaders(res, filePath) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!INLINE_EXT.has(path.extname(filePath).toLowerCase())) {
      res.setHeader('Content-Disposition', 'attachment');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    }
  },
}));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/files', require('./routes/files'));
app.use('/api/follow', require('./routes/follow'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/points', require('./routes/points'));
app.use('/api/community', require('./routes/community'));
app.use('/api/timelogs', require('./routes/timelogs'));
app.use('/api/notifications', require('./routes/notifications'));
const GIT_SHA = (() => {
  try { return require('child_process').execSync('git rev-parse HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return 'unknown'; }
})();
app.get('/api/health', (req, res) => res.json({ ok: true, version: GIT_SHA }));

// Serve frontend
const frontendDist = path.join(__dirname, '../frontend/dist');
const indexHtml = path.join(frontendDist, 'index.html');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  // Catch-all: serve index.html for any non-API route (SPA routing)
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    try {
      const html = fs.readFileSync(indexHtml, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (e) {
      next(e);
    }
  });
}

// Last-resort error handler: log the details, return a plain JSON error.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({ error: err.status && err.status < 500 ? err.message : 'Server error' });
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  // Express 5 passes listen errors (e.g. port already in use) to this callback instead of throwing.
  app.listen(PORT, (err) => {
    if (err) {
      console.error(`BuildVault could not listen on port ${PORT}: ${err.code || err.message}. Is another copy already running?`);
      process.exit(1);
    }
    console.log(`BuildVault API running on port ${PORT} (${GIT_SHA.slice(0, 7)})`);
  });
}

module.exports = app;
