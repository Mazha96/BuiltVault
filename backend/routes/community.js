const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuid } = require('uuid');
const db = require('../db');
const auth = require('../middleware/auth');
const { notify } = require('../services/notify');
require('dotenv').config();

const router = express.Router();

const CATEGORIES = ['general','help','showcase','electronics','3d-printing','software','woodworking','metalwork'];

const storage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR || './uploads',
  filename: (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`)
});
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, IMAGE_EXT.includes(path.extname(file.originalname).toLowerCase())),
});

function isMod(userId) {
  const u = db.prepare('SELECT role FROM users WHERE id=?').get(userId);
  return u?.role === 'supermod' || u?.role === 'admin';
}

function parseImages(str) {
  try { return JSON.parse(str || '[]'); } catch { return []; }
}

// POST /api/community/upload — upload images for posts/replies
router.post('/upload', auth, upload.array('images', 5), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No files' });
  const urls = req.files.map(f => `/uploads/${f.filename}`);
  res.json({ urls });
});

// GET /api/community/mine — user's own projects for linking
router.get('/mine', auth, (req, res) => {
  const projects = db.prepare('SELECT id, title FROM projects WHERE user_id=? ORDER BY updated_at DESC').all(req.user.id);
  res.json(projects);
});

// GET /api/community
router.get('/', auth, (req, res) => {
  const { category, search } = req.query;
  let query = `
    SELECT cp.*, u.username, u.display_name, u.avatar_url, u.role,
      (SELECT COUNT(*) FROM community_replies cr WHERE cr.post_id=cp.id AND cr.is_deleted=0) as reply_count,
      pr.title as project_title, pr.cover_url as project_cover, pr.category as project_category
    FROM community_posts cp
    JOIN users u ON cp.user_id=u.id
    LEFT JOIN projects pr ON cp.project_id=pr.id
    WHERE cp.is_deleted=0
  `;
  const params = [];
  if (category && category !== 'all') { query += ` AND cp.category=?`; params.push(category); }
  if (search) { query += ` AND (cp.title LIKE ? OR cp.body LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
  query += ` ORDER BY cp.created_at DESC LIMIT 50`;
  res.json(db.prepare(query).all(...params));
});

// POST /api/community
router.post('/', auth, (req, res) => {
  const { title, body, category, project_id, images } = req.body;
  if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: 'Title and body required' });
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  const id = uuid();
  db.prepare('INSERT INTO community_posts (id,user_id,category,title,body,project_id,images) VALUES (?,?,?,?,?,?,?)')
    .run(id, req.user.id, category, title.trim(), body.trim(), project_id || null, JSON.stringify(images || []));
  const post = db.prepare(`
    SELECT cp.*, u.username, u.display_name, u.avatar_url, u.role
    FROM community_posts cp JOIN users u ON cp.user_id=u.id WHERE cp.id=?
  `).get(id);
  res.status(201).json(post);
});

// GET /api/community/:id
router.get('/:id', auth, (req, res) => {
  const post = db.prepare(`
    SELECT cp.*, u.username, u.display_name, u.avatar_url, u.role,
      pr.title as project_title, pr.cover_url as project_cover, pr.category as project_category
    FROM community_posts cp JOIN users u ON cp.user_id=u.id
    LEFT JOIN projects pr ON cp.project_id=pr.id
    WHERE cp.id=? AND cp.is_deleted=0
  `).get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });

  const replies = db.prepare(`
    SELECT cr.*, u.username, u.display_name, u.avatar_url, u.role
    FROM community_replies cr JOIN users u ON cr.user_id=u.id
    WHERE cr.post_id=? AND cr.is_deleted=0
    ORDER BY cr.created_at ASC
  `).all(req.params.id);

  res.json({ ...post, replies });
});

// DELETE /api/community/:id
router.delete('/:id', auth, (req, res) => {
  const post = db.prepare('SELECT * FROM community_posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  if (post.user_id !== req.user.id && !isMod(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('UPDATE community_posts SET is_deleted=1 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// POST /api/community/:id/replies
router.post('/:id/replies', auth, (req, res) => {
  const { body, images } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Reply body required' });
  const post = db.prepare('SELECT id FROM community_posts WHERE id=? AND is_deleted=0').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const id = uuid();
  db.prepare('INSERT INTO community_replies (id,post_id,user_id,body,images) VALUES (?,?,?,?,?)')
    .run(id, req.params.id, req.user.id, body.trim(), JSON.stringify(images || []));
  // Notify post author
  const actor = db.prepare('SELECT username, display_name, avatar_url FROM users WHERE id=?').get(req.user.id);
  const fullPost = db.prepare('SELECT user_id, title FROM community_posts WHERE id=?').get(req.params.id);
  if (fullPost && fullPost.user_id !== req.user.id) {
    notify(fullPost.user_id, 'community_reply', { actorId: req.user.id, actorName: actor?.display_name || actor?.username, actorAvatar: actor?.avatar_url, postId: req.params.id, postTitle: fullPost.title });
  }
  const reply = db.prepare(`
    SELECT cr.*, u.username, u.display_name, u.avatar_url, u.role
    FROM community_replies cr JOIN users u ON cr.user_id=u.id WHERE cr.id=?
  `).get(id);
  res.status(201).json(reply);
});

// DELETE /api/community/:id/replies/:replyId
router.delete('/:id/replies/:replyId', auth, (req, res) => {
  const reply = db.prepare('SELECT * FROM community_replies WHERE id=?').get(req.params.replyId);
  if (!reply) return res.status(404).json({ error: 'Not found' });
  if (reply.user_id !== req.user.id && !isMod(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('UPDATE community_replies SET is_deleted=1 WHERE id=?').run(req.params.replyId);
  res.json({ ok: true });
});

module.exports = router;
