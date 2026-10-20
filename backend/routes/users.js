const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me — own profile with stats
router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, email, bio, avatar_url, created_at, display_name FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });

  const followers = db.prepare('SELECT COUNT(*) as c FROM follows_users WHERE following_id=?').get(req.user.id).c;
  const following = db.prepare('SELECT COUNT(*) as c FROM follows_users WHERE follower_id=?').get(req.user.id).c;
  const followingProjects = db.prepare('SELECT COUNT(*) as c FROM follows_projects WHERE user_id=?').get(req.user.id).c;
  const projects = db.prepare('SELECT COUNT(*) as c FROM projects WHERE user_id=?').get(req.user.id).c;

  // Who I follow
  const followingUsers = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url
    FROM follows_users f JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ?
  `).all(req.user.id);

  // Who follows me
  const followerUsers = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url
    FROM follows_users f JOIN users u ON f.follower_id = u.id
    WHERE f.following_id = ?
  `).all(req.user.id);

  // Projects I follow
  const followedProjects = db.prepare(`
    SELECT p.id, p.title, p.cover_url, p.category, u.username, u.display_name
    FROM follows_projects f
    JOIN projects p ON f.project_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE f.user_id = ?
  `).all(req.user.id);

  res.json({
    ...user,
    stats: { followers, following, followingProjects, projects },
    followingUsers,
    followerUsers,
    followedProjects,
  });
});

// PATCH /api/users/me — update display name / bio
router.patch('/me', auth, (req, res) => {
  const { display_name, bio } = req.body;
  if (display_name !== undefined) {
    const value = display_name.trim();
    if (value.length < 2 || value.length > 40) return res.status(400).json({ error: 'Display name must be 2-40 characters' });
    db.prepare('UPDATE users SET display_name=? WHERE id=?').run(value, req.user.id);
  }
  if (bio !== undefined) {
    db.prepare('UPDATE users SET bio=? WHERE id=?').run(bio.slice(0, 280), req.user.id);
  }
  const user = db.prepare('SELECT id, username, email, bio, avatar_url, created_at, display_name FROM users WHERE id=?').get(req.user.id);
  res.json(user);
});

// GET /api/users/:id — public profile
router.get('/:id', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, avatar_url, bio, created_at FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const followers = db.prepare('SELECT COUNT(*) as c FROM follows_users WHERE following_id=?').get(req.params.id).c;
  const following = db.prepare('SELECT COUNT(*) as c FROM follows_users WHERE follower_id=?').get(req.params.id).c;
  const isFollowing = !!db.prepare('SELECT 1 FROM follows_users WHERE follower_id=? AND following_id=?').get(req.user.id, req.params.id);

  const projects = db.prepare(`
    SELECT p.*, 
      COALESCE(SUM(pt.points),0) as total_points,
      (SELECT COUNT(*) FROM follows_projects fp WHERE fp.project_id=p.id) as followers_count
    FROM projects p
    LEFT JOIN points_transactions pt ON pt.project_id=p.id
    WHERE p.user_id=? AND p.is_public=1
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `).all(req.params.id);

  res.json({ ...user, stats: { followers, following, projects: projects.length }, isFollowing, projects });
});

module.exports = router;
