const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuid } = require('uuid');
const db = require('../db');
const auth = require('../middleware/auth');
const { logActivity } = require('../services/activity');
require('dotenv').config();

const router = express.Router();
const uploadDir = process.env.UPLOAD_DIR || './uploads';

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${uuid()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/:projectId', auth, upload.single('file'), (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(req.params.projectId, req.user.id);
  if (!project) return res.status(403).json({ error: 'Forbidden' });
  if (!req.file) return res.status(400).json({ error: 'No file' });

  const ext = path.extname(req.file.originalname).toLowerCase();
  let file_type = 'other';
  if (['.jpg','.jpeg','.png','.gif','.webp'].includes(ext)) file_type = 'image';
  else if (['.pdf'].includes(ext)) file_type = 'pdf';
  else if (['.stl','.obj','.3mf'].includes(ext)) file_type = '3d';
  else if (['.dxf','.svg'].includes(ext)) file_type = 'blueprint';

  const id = uuid();
  const url = `/uploads/${req.file.filename}`;
  db.prepare('INSERT INTO project_files (id,project_id,filename,original_name,file_type,file_size,url) VALUES (?,?,?,?,?,?,?)')
    .run(id, req.params.projectId, req.file.filename, req.file.originalname, file_type, req.file.size, url);

  logActivity({
    actorId: req.user.id,
    projectId: req.params.projectId,
    type: 'file_uploaded',
    data: { fileId: id, name: req.file.originalname, file_type }
  });

  // Optionally publish as a post
  const { publish, caption } = req.body;
  if (publish === 'true' || publish === true) {
    db.prepare('INSERT INTO posts (id, project_id, user_id, type, data, caption) VALUES (?,?,?,?,?,?)')
      .run(uuid(), req.params.projectId, req.user.id, 'file_upload',
        JSON.stringify({ fileId: id, name: req.file.originalname, file_type, url }),
        caption || '');
  }

  res.json(db.prepare('SELECT * FROM project_files WHERE id=?').get(id));
});

// POST /api/files/:projectId/cover — upload + set project cover photo
router.post('/:projectId/cover', auth, upload.single('file'), (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(req.params.projectId, req.user.id);
  if (!project) return res.status(403).json({ error: 'Forbidden' });
  if (!req.file) return res.status(400).json({ error: 'No file' });

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!['.jpg','.jpeg','.png','.gif','.webp','.heic','.heif'].includes(ext)) {
    return res.status(400).json({ error: 'Only image files allowed for cover' });
  }

  const url = `/uploads/${req.file.filename}`;
  db.prepare("UPDATE projects SET cover_url=?, updated_at=datetime('now') WHERE id=?").run(url, req.params.projectId);
  res.json({ cover_url: url });
});

router.delete('/:projectId/:fileId', auth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(req.params.projectId, req.user.id);
  if (!project) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM project_files WHERE id=? AND project_id=?').run(req.params.fileId, req.params.projectId);
  res.json({ ok: true });
});

module.exports = router;
