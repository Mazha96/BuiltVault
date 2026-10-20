const { v4: uuid } = require('uuid');
const db = require('../db');

function notify(userId, type, data = {}) {
  if (!userId) return;
  try {
    db.prepare('INSERT INTO notifications (id, user_id, type, data) VALUES (?,?,?,?)')
      .run(uuid(), userId, type, JSON.stringify(data));
  } catch (e) {
    console.error('notify error:', e.message);
  }
}

module.exports = { notify };
