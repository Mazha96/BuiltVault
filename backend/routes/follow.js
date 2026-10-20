const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const auth = require('../middleware/auth');
const { getFeedForUser } = require('../services/activity');
const { notify } = require('../services/notify');

const router = express.Router();

// Follow a creator (user)
router.post('/users/:userId', auth, (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });
    if (!db.prepare('SELECT 1 FROM users WHERE id=?').get(userId)) return res.status(404).json({ error: 'User not found' });
    db.prepare('INSERT OR IGNORE INTO follows_users (id, follower_id, following_id) VALUES (?,?,?)')
      .run(uuid(), req.user.id, userId);
    // Notify the followed user
    const actor = db.prepare('SELECT username, display_name, avatar_url FROM users WHERE id=?').get(req.user.id);
    notify(userId, 'follow_user', { actorId: req.user.id, actorName: actor?.display_name || actor?.username, actorAvatar: actor?.avatar_url });
    res.json({ ok: true });
  } catch (err) {
    console.error('Follow user error', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/users/:userId', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM follows_users WHERE follower_id=? AND following_id=?')
      .run(req.user.id, req.params.userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Unfollow user error', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Follow a project
router.post('/projects/:projectId', auth, (req, res) => {
  try {
    const target = db.prepare('SELECT user_id, is_public FROM projects WHERE id=?').get(req.params.projectId);
    if (!target) return res.status(404).json({ error: 'Not found' });
    if (!target.is_public && target.user_id !== req.user.id) return res.status(403).json({ error: 'Private project' });
    db.prepare('INSERT OR IGNORE INTO follows_projects (id, user_id, project_id) VALUES (?,?,?)')
      .run(uuid(), req.user.id, req.params.projectId);
    // Notify the project owner
    const proj = db.prepare('SELECT user_id, title FROM projects WHERE id=?').get(req.params.projectId);
    if (proj && proj.user_id !== req.user.id) {
      const actor = db.prepare('SELECT username, display_name, avatar_url FROM users WHERE id=?').get(req.user.id);
      notify(proj.user_id, 'follow_project', { actorId: req.user.id, actorName: actor?.display_name || actor?.username, actorAvatar: actor?.avatar_url, projectId: req.params.projectId, projectTitle: proj.title });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Follow project error', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/projects/:projectId', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM follows_projects WHERE user_id=? AND project_id=?')
      .run(req.user.id, req.params.projectId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Unfollow project error', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Activity feed
router.get('/feed', auth, (req, res) => {
  const feed = getFeedForUser(req.user.id);
  res.json(feed);
});

module.exports = router;
