const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

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
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || './uploads')));

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
app.get('/api/health', (req, res) => res.json({ ok: true }));

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`BuildVault API running on port ${PORT}`));
