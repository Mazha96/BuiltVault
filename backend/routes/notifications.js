const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', auth, (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id).map(n => ({ ...n, data: JSON.parse(n.data || '{}') }));

  const unread = notifications.filter(n => !n.is_read).length;
  res.json({ notifications, unread });
});

// POST /api/notifications/read — mark all read
router.post('/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.user.id);
  res.json({ ok: true });
});

// POST /api/notifications/read/:id — mark one read
router.post('/read/:id', auth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
