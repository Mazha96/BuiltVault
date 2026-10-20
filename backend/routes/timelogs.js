const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/timelogs/:projectId — all logs + streak + totals for a project
router.get('/:projectId', auth, (req, res) => {
  const logs = db.prepare(`
    SELECT * FROM time_logs
    WHERE project_id=? AND user_id=?
    ORDER BY logged_at DESC
  `).all(req.params.projectId, req.user.id);

  const totalMinutes = logs.reduce((s, l) => s + l.duration_minutes, 0);

  // Streak: consecutive calendar days with at least one log (from today backwards)
  const days = [...new Set(logs.map(l => l.logged_at.split('T')[0]))].sort().reverse();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < days.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    const expectedStr = expected.toISOString().split('T')[0];
    if (days[i] === expectedStr) streak++;
    else break;
  }

  // Weekly summary — last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weeklyMinutes = logs
    .filter(l => new Date(l.logged_at) >= weekAgo)
    .reduce((s, l) => s + l.duration_minutes, 0);

  // Daily breakdown for chart (last 30 days)
  const chartData = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const mins = logs
      .filter(l => l.logged_at.split('T')[0] === dateStr)
      .reduce((s, l) => s + l.duration_minutes, 0);
    chartData.push({ date: dateStr, minutes: mins });
  }

  // Achievements for this project
  const achievements = db.prepare('SELECT * FROM achievements WHERE user_id=? AND project_id=? ORDER BY milestone')
    .all(req.user.id, req.params.projectId);

  // Best streak ever (simple: max consecutive days)
  const allDays = [...new Set(logs.map(l => l.logged_at.split('T')[0]))].sort();
  let bestStreak = 0, cur = 0;
  for (let i = 0; i < allDays.length; i++) {
    if (i === 0) { cur = 1; continue; }
    const prev = new Date(allDays[i-1]), curr = new Date(allDays[i]);
    const diff = (curr - prev) / 86400000;
    cur = diff === 1 ? cur + 1 : 1;
    if (cur > bestStreak) bestStreak = cur;
  }
  if (cur > bestStreak) bestStreak = cur;

  res.json({ logs, totalMinutes, weeklyMinutes, streak, bestStreak, chartData, achievements });
});

const MILESTONES = [3, 7, 14, 30, 60, 100];
const MILESTONE_REWARDS = {
  3:   { emoji: '🔥',  title: 'On a Roll',     desc: '3 days straight — you\'re building momentum!' },
  7:   { emoji: '🔥',  title: 'One Week',       desc: 'A full week of focus. Keep it going!' },
  14:  { emoji: '⚡',  title: 'Two Weeks',      desc: 'Two weeks in. This is becoming a habit.' },
  30:  { emoji: '🏆',  title: 'One Month',      desc: '30 days! You\'re genuinely committed to this.' },
  60:  { emoji: '💀',  title: 'Unstoppable',    desc: '60 days. Most people quit. Not you.' },
  100: { emoji: '👑',  title: 'Legend',         desc: '100 days of focused work. Legendary.' },
};

function calcStreak(projectId, userId) {
  const logs = db.prepare(`
    SELECT DISTINCT date(logged_at) as day FROM time_logs
    WHERE project_id=? AND user_id=?
    ORDER BY day DESC
  `).all(projectId, userId);

  const days = logs.map(l => l.day);
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < days.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    const expectedStr = expected.toISOString().split('T')[0];
    if (days[i] === expectedStr) streak++;
    else break;
  }
  return streak;
}

// POST /api/timelogs/:projectId — log a session
router.post('/:projectId', auth, (req, res) => {
  const { duration_minutes, notes, logged_at, focus_session } = req.body;
  const minutes = Number(duration_minutes);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 24 * 60) return res.status(400).json({ error: 'Duration must be a whole number of minutes (1 to 1440)' });
  if (logged_at !== undefined && (typeof logged_at !== 'string' || Number.isNaN(Date.parse(logged_at)) || Date.parse(logged_at) > Date.now() + 86400000)) {
    return res.status(400).json({ error: 'logged_at must be an ISO date, not in the future' });
  }

  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  // Only the project owner logs work time on it (visitors can still see public stats).
  if (project.user_id !== req.user.id) return res.status(403).json({ error: 'Only the owner can log time' });

  const id = uuid();
  const date = logged_at ? new Date(logged_at).toISOString() : new Date().toISOString();
  db.prepare(`INSERT INTO time_logs (id, project_id, user_id, duration_minutes, notes, logged_at, focus_session)
    VALUES (?,?,?,?,?,?,?)`)
    .run(id, req.params.projectId, req.user.id, minutes, String(notes || '').slice(0, 1000), date, focus_session ? 1 : 0);

  // Recalculate streak and check for new milestone achievements
  const streak = calcStreak(req.params.projectId, req.user.id);
  let newAchievement = null;

  if (MILESTONES.includes(streak)) {
    const already = db.prepare('SELECT id FROM achievements WHERE user_id=? AND project_id=? AND milestone=?')
      .get(req.user.id, req.params.projectId, streak);
    if (!already) {
      const achId = uuid();
      db.prepare('INSERT INTO achievements (id,user_id,project_id,type,milestone) VALUES (?,?,?,?,?)')
        .run(achId, req.user.id, req.params.projectId, 'streak', streak);
      newAchievement = { milestone: streak, ...MILESTONE_REWARDS[streak] };
    }
  }

  res.json({
    log: db.prepare('SELECT * FROM time_logs WHERE id=?').get(id),
    streak,
    newAchievement
  });
});

// DELETE /api/timelogs/:projectId/:logId
router.delete('/:projectId/:logId', auth, (req, res) => {
  const log = db.prepare('SELECT * FROM time_logs WHERE id=? AND user_id=?').get(req.params.logId, req.user.id);
  if (!log) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM time_logs WHERE id=?').run(req.params.logId);
  res.json({ ok: true });
});

// GET /api/timelogs/:projectId/public — public stats (no auth, for project detail page visitors)
router.get('/:projectId/public', (req, res) => {
  const project = db.prepare('SELECT is_public FROM projects WHERE id=?').get(req.params.projectId);
  if (!project || !project.is_public) return res.status(404).json({ error: 'Not found' });
  const logs = db.prepare(`
    SELECT t.duration_minutes, t.logged_at, u.display_name, u.username
    FROM time_logs t JOIN users u ON t.user_id = u.id
    WHERE t.project_id=?
    ORDER BY t.logged_at DESC LIMIT 50
  `).all(req.params.projectId);

  const totalMinutes = logs.reduce((s, l) => s + l.duration_minutes, 0);
  const days = [...new Set(logs.map(l => String(l.logged_at).split('T')[0]))];

  res.json({ logs, totalMinutes, sessionCount: logs.length, activeDays: days.length });
});

module.exports = router;
