const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const auth = require('../middleware/auth');
const { notify } = require('../services/notify');

const router = express.Router();

const DAILY_BUDGET = 10;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getRemainingPoints(userId) {
  const date = today();
  const spent = db.prepare(
    'SELECT COALESCE(SUM(points),0) as total FROM points_transactions WHERE user_id=? AND date=?'
  ).get(userId, date);
  return DAILY_BUDGET - (spent.total || 0);
}

// GET /api/points/me — remaining points today + total given
router.get('/me', auth, (req, res) => {
  const remaining = getRemainingPoints(req.user.id);
  const history = db.prepare(`
    SELECT pt.project_id, pr.title, SUM(pt.points) as points_given, pt.date
    FROM points_transactions pt
    JOIN projects pr ON pt.project_id = pr.id
    WHERE pt.user_id = ?
    GROUP BY pt.project_id, pt.date
    ORDER BY pt.date DESC
    LIMIT 20
  `).all(req.user.id);
  res.json({ remaining, daily_budget: DAILY_BUDGET, history });
});

// POST /api/points/:projectId — give points to a project
router.post('/:projectId', auth, (req, res) => {
  const { amount } = req.body;
  const pts = parseInt(amount);
  if (!pts || pts < 1) return res.status(400).json({ error: 'Amount must be at least 1' });

  const project = db.prepare('SELECT * FROM projects WHERE id=? AND is_public=1').get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (project.user_id === req.user.id) return res.status(400).json({ error: 'Cannot give points to your own project' });

  const remaining = getRemainingPoints(req.user.id);
  if (pts > remaining) return res.status(400).json({ error: `Only ${remaining} points remaining today` });

  db.prepare('INSERT INTO points_transactions (id, user_id, project_id, points, date) VALUES (?,?,?,?,?)')
    .run(uuidv4(), req.user.id, req.params.projectId, pts, today());
  // Notify project owner
  const actor = db.prepare('SELECT username, display_name, avatar_url FROM users WHERE id=?').get(req.user.id);
  notify(project.user_id, 'points_received', { actorId: req.user.id, actorName: actor?.display_name || actor?.username, points: pts, projectId: req.params.projectId, projectTitle: project.title });
  res.json({ ok: true, remaining: remaining - pts });
});

// GET /api/points/leaderboard?period=today|week|all
router.get('/leaderboard', auth, (req, res) => {
  const period = req.query.period || 'week';
  let dateFilter = '';
  if (period === 'today') dateFilter = `AND pt.date = '${today()}'`;
  else if (period === 'week') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    dateFilter = `AND pt.date >= '${weekAgo}'`;
  }

  const projects = db.prepare(`
    SELECT pr.id, pr.title, pr.description, pr.cover_url, pr.category,
      u.username, u.display_name,
      COALESCE(SUM(pt.points), 0) as total_points
    FROM projects pr
    JOIN users u ON pr.user_id = u.id
    LEFT JOIN points_transactions pt ON pt.project_id = pr.id ${dateFilter}
    WHERE pr.is_public = 1
    GROUP BY pr.id
    ORDER BY total_points DESC
    LIMIT 20
  `).all();

  res.json(projects);
});

module.exports = router;
