const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db = require('../db');
require('dotenv').config();

const router = express.Router();

function validatePassword(password) {
  const errors = [];
  if (!password || password.length < 12) errors.push('At least 12 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('At least one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) errors.push('At least one special character (!@#$%^&* etc.)');
  return errors;
}

router.post('/register', async (req, res) => {
  const { username, email, password, recovery_question, recovery_answer } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields required' });

  const pwErrors = validatePassword(password);
  if (pwErrors.length) return res.status(400).json({ error: pwErrors.join(', ') });

  if (!recovery_question || !recovery_answer)
    return res.status(400).json({ error: 'Recovery question and answer required' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const answerHash = await bcrypt.hash(recovery_answer.toLowerCase().trim(), 10);
    const id = uuid();
    db.prepare(`INSERT INTO users (id, username, email, password_hash, recovery_question, recovery_answer_hash, display_name) VALUES (?,?,?,?,?,?,?)`)
      .run(id, username, email, hash, recovery_question, answerHash, username);
    const token = jwt.sign({ id, username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id, username, email, display_name: username } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username or email already taken' });
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, display_name: user.display_name || user.username } });
});

router.get('/me', require('../middleware/auth'), (req, res) => {
  const user = db.prepare('SELECT id, username, email, bio, avatar_url, created_at, display_name FROM users WHERE id=?').get(req.user.id);
  res.json(user);
});

// Get recovery question for a username
router.post('/recovery-question', (req, res) => {
  const { username } = req.body;
  const user = db.prepare('SELECT recovery_question FROM users WHERE username=?').get(username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ question: user.recovery_question });
});

// Reset password using recovery answer
router.post('/reset-password', async (req, res) => {
  const { username, recovery_answer, new_password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const ok = await bcrypt.compare(recovery_answer.toLowerCase().trim(), user.recovery_answer_hash);
  if (!ok) return res.status(401).json({ error: 'Incorrect recovery answer' });

  const pwErrors = validatePassword(new_password);
  if (pwErrors.length) return res.status(400).json({ error: pwErrors.join(', ') });

  const hash = await bcrypt.hash(new_password, 10);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, user.id);
  res.json({ ok: true });
});

module.exports = router;
