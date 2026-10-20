const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me — own profile with stats
router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, email, bio, avatar_url, created_at, display_name, headline, location, github_url, website_url, resume_url, linkedin_url FROM users WHERE id=?').get(req.user.id);
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
    WHERE f.user_id = ? AND (p.is_public = 1 OR p.user_id = ?)
  `).all(req.user.id, req.user.id);

  res.json({
    ...user,
    stats: { followers, following, followingProjects, projects },
    followingUsers,
    followerUsers,
    followedProjects,
  });
});

const { cleanUrl } = require('../lib/url');
const LINK_FIELDS = ['github_url', 'website_url', 'resume_url', 'linkedin_url'];

// PATCH /api/users/me — update display name, bio, headline, location and links
router.patch('/me', auth, (req, res) => {
  const { display_name, bio, headline, location } = req.body;
  // Validate everything first, then write in one transaction: a 400 never leaves a half-saved profile.
  const updates = {};
  for (const f of LINK_FIELDS) {
    if (req.body[f] === undefined) continue;
    const v = cleanUrl(req.body[f]);
    if (v === null) return res.status(400).json({ error: `${f} must be a valid http(s) link` });
    updates[f] = v;
  }
  if (display_name !== undefined) {
    const value = String(display_name).trim();
    if (value.length < 2 || value.length > 40) return res.status(400).json({ error: 'Display name must be 2-40 characters' });
    updates.display_name = value;
  }
  if (headline !== undefined) updates.headline = String(headline).trim().slice(0, 120);
  if (location !== undefined) updates.location = String(location).trim().slice(0, 60);
  if (bio !== undefined) updates.bio = String(bio).slice(0, 280);
  db.transaction(() => {
    for (const [col, val] of Object.entries(updates)) db.prepare(`UPDATE users SET ${col}=? WHERE id=?`).run(val, req.user.id);
  })();
  const user = db.prepare('SELECT id, username, email, bio, avatar_url, created_at, display_name, headline, location, github_url, website_url, resume_url, linkedin_url FROM users WHERE id=?').get(req.user.id);
  res.json(user);
});

// GET /api/users/:id — public profile
// GET /api/users/:id — public profile, works signed-out
// :id can be a Clerk user ID OR a username (prefixed with @)
router.get('/:id', async (req, res) => {
  const param = req.params.id;

  // Support /u/:username by looking up by username if param doesn't look like a Clerk ID
  const user = param.startsWith('user_')
    ? db.prepare('SELECT id, username, display_name, avatar_url, bio, created_at, headline, location, github_url, website_url, resume_url, linkedin_url FROM users WHERE id=?').get(param)
    : db.prepare('SELECT id, username, display_name, avatar_url, bio, created_at, headline, location, github_url, website_url, resume_url, linkedin_url FROM users WHERE username=? COLLATE NOCASE').get(param);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const followers = db.prepare('SELECT COUNT(*) as c FROM follows_users WHERE following_id=?').get(user.id).c;
  const following = db.prepare('SELECT COUNT(*) as c FROM follows_users WHERE follower_id=?').get(user.id).c;

  // Check if the viewer is following (optional auth)
  let isFollowing = false;
  try {
    const { verifyToken } = require('@clerk/express');
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      const viewerId = payload?.sub;
      if (viewerId) {
        isFollowing = !!db.prepare('SELECT 1 FROM follows_users WHERE follower_id=? AND following_id=?').get(viewerId, user.id);
      }
    }
  } catch {}

  const projects = db.prepare(`
    SELECT p.*,
      COALESCE(SUM(pt.points),0) as total_points,
      (SELECT COUNT(*) FROM follows_projects fp WHERE fp.project_id=p.id) as followers_count,
      (SELECT CAST(ROUND(100.0 * SUM(t.is_done) / COUNT(*)) AS INTEGER) FROM tasks t WHERE t.project_id=p.id) as progress
    FROM projects p
    LEFT JOIN points_transactions pt ON pt.project_id=p.id
    WHERE p.user_id=? AND p.is_public=1
    GROUP BY p.id
    ORDER BY p.is_featured DESC, p.featured_order ASC, p.updated_at DESC
  `).all(user.id);

  res.json({ ...user, stats: { followers, following, projects: projects.length }, isFollowing, projects });
});

module.exports = router;
