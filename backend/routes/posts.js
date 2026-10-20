const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('@clerk/express');
const db = require('../db');
const auth = require('../middleware/auth');

async function getViewerId(req) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return payload?.sub || null;
  } catch { return null; }
}

const router = express.Router();

// A post is visible if its project is public or the viewer owns the project.
function visiblePost(postId, viewerId) {
  const row = db.prepare(`SELECT p.id, p.user_id, pr.user_id AS owner_id, pr.is_public
    FROM posts p JOIN projects pr ON pr.id = p.project_id WHERE p.id=?`).get(postId);
  if (!row) return { status: 404 };
  if (!row.is_public && row.owner_id !== viewerId) return { status: 403 };
  return { status: 200, row };
}

// POST /api/posts/manual — create a manual post (cover update, milestone, etc.)
router.post('/manual', auth, (req, res) => {
  const { projectId, type, caption, data } = req.body;
  if (!projectId || !type) return res.status(400).json({ error: 'projectId and type required' });
  const project = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(projectId, req.user.id);
  if (!project) return res.status(403).json({ error: 'Forbidden' });
  const id = uuidv4();
  db.prepare('INSERT INTO posts (id, project_id, user_id, type, data, caption) VALUES (?,?,?,?,?,?)')
    .run(id, projectId, req.user.id, type, JSON.stringify(data || {}), caption || '');
  res.status(201).json({ id, ok: true });
});

// GET /api/posts/feed — posts from followed users + projects
router.get('/feed', auth, (req, res) => {
  const userId = req.user.id;
  const posts = db.prepare(`
    SELECT p.*, 
      u.username, u.display_name, u.avatar_url,
      pr.title as project_title, pr.cover_url as project_cover,
      (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) as comment_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    JOIN projects pr ON p.project_id = pr.id
    WHERE pr.is_public = 1
    AND (
      p.user_id IN (
        SELECT following_id FROM follows_users WHERE follower_id = ?
      )
      OR p.project_id IN (
        SELECT project_id FROM follows_projects WHERE user_id = ?
      )
      OR p.user_id = ?
    )
    ORDER BY p.created_at DESC
    LIMIT 50
  `).all(userId, userId, userId);

  res.json(posts.map(p => ({ ...p, data: JSON.parse(p.data || '{}') })));
});

// GET /api/posts/history/:projectId — full progress history
router.get('/history/:projectId', async (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const viewerId = await getViewerId(req);
  if (!project.is_public && project.user_id !== viewerId) return res.status(403).json({ error: 'Private project' });

  const posts = db.prepare(`
    SELECT p.*,
      u.username, u.display_name, u.avatar_url,
      (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) as comment_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.project_id = ?
    ORDER BY p.created_at DESC
  `).all(req.params.projectId);
  res.json(posts.map(p => ({ ...p, data: JSON.parse(p.data || '{}') })));
});

// GET /api/posts/project/:projectId — posts for a specific project
router.get('/project/:projectId', async (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const viewerId = await getViewerId(req);
  if (!project.is_public && project.user_id !== viewerId) return res.status(403).json({ error: 'Private project' });

  const posts = db.prepare(`
    SELECT p.*,
      u.username, u.display_name, u.avatar_url,
      (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) as comment_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.project_id = ?
    ORDER BY p.created_at DESC
  `).all(req.params.projectId);
  res.json(posts.map(p => ({ ...p, data: JSON.parse(p.data || '{}') })));
});

// GET /api/posts/:id — single post (works signed-out for public projects)
router.get('/:id', async (req, res) => {
  const v = visiblePost(req.params.id, await getViewerId(req));
  if (v.status !== 200) return res.status(v.status).json({ error: v.status === 404 ? 'Post not found' : 'Private project' });
  const post = db.prepare(`
    SELECT p.*,
      u.username, u.display_name, u.avatar_url,
      pr.title as project_title
    FROM posts p
    JOIN users u ON p.user_id = u.id
    JOIN projects pr ON p.project_id = pr.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json({ ...post, data: JSON.parse(post.data || '{}') });
});

// GET /api/posts/:id/comments (works signed-out for public projects)
router.get('/:id/comments', async (req, res) => {
  const v = visiblePost(req.params.id, await getViewerId(req));
  if (v.status !== 200) return res.status(v.status).json({ error: v.status === 404 ? 'Post not found' : 'Private project' });
  const comments = db.prepare(`
    SELECT c.*, u.username, u.display_name, u.avatar_url
    FROM post_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

// POST /api/posts/:id/comments
router.post('/:id/comments', auth, (req, res) => {
  const { comment } = req.body;
  if (!comment || !comment.trim()) return res.status(400).json({ error: 'Comment required' });
  const v = visiblePost(req.params.id, req.user.id);
  if (v.status !== 200) return res.status(v.status).json({ error: v.status === 404 ? 'Post not found' : 'Private project' });
  const id = uuidv4();
  db.prepare('INSERT INTO post_comments (id, post_id, user_id, comment) VALUES (?,?,?,?)')
    .run(id, req.params.id, req.user.id, comment.trim());
  const saved = db.prepare(`
    SELECT c.*, u.username, u.display_name, u.avatar_url
    FROM post_comments c JOIN users u ON c.user_id=u.id
    WHERE c.id=?
  `).get(id);
  res.status(201).json(saved);
});

// DELETE /api/posts/:id/comments/:commentId
router.delete('/:id/comments/:commentId', auth, (req, res) => {
  const comment = db.prepare('SELECT * FROM post_comments WHERE id=?').get(req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Not found' });
  if (comment.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM post_comments WHERE id=?').run(req.params.commentId);
  res.json({ ok: true });
});

// DELETE /api/posts/:id — the post's author, the project owner, or a supermod
router.delete('/:id', auth, (req, res) => {
  const post = db.prepare('SELECT p.id, p.user_id, pr.user_id AS owner_id FROM posts p JOIN projects pr ON pr.id=p.project_id WHERE p.id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const me = db.prepare('SELECT role FROM users WHERE id=?').get(req.user.id);
  const allowed = post.user_id === req.user.id || post.owner_id === req.user.id || me?.role === 'supermod';
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  db.transaction(() => {
    db.prepare('DELETE FROM post_comments WHERE post_id=?').run(post.id);
    db.prepare('DELETE FROM posts WHERE id=?').run(post.id);
  })();
  res.json({ ok: true });
});

module.exports = router;
