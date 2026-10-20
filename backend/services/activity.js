const { v4: uuid } = require('uuid');
const db = require('../db');

function logActivity({ actorId = null, projectId = null, type, data = {} }) {
  if (!type) return;
  db.prepare(`INSERT INTO activity_log (id, actor_id, project_id, type, data)
    VALUES (?,?,?,?,?)`).run(uuid(), actorId, projectId, type, JSON.stringify(data));
}

function getFeedForUser(userId, limit = 50) {
  if (!userId) return [];
  const followedProjects = db
    .prepare('SELECT project_id FROM follows_projects WHERE user_id=?')
    .all(userId)
    .map(row => row.project_id);
  const followedCreators = db
    .prepare('SELECT following_id FROM follows_users WHERE follower_id=?')
    .all(userId)
    .map(row => row.following_id);

  if (!followedProjects.length && !followedCreators.length) return [];

  const clauses = [];
  const params = [];
  if (followedProjects.length) {
    clauses.push(`a.project_id IN (${followedProjects.map(() => '?').join(',')})`);
    params.push(...followedProjects);
  }
  if (followedCreators.length) {
    clauses.push(`a.actor_id IN (${followedCreators.map(() => '?').join(',')})`);
    params.push(...followedCreators);
  }

  const where = clauses.length ? clauses.join(' OR ') : '1=0';

  const rows = db.prepare(`
    SELECT a.*, p.title AS project_title, p.category, u.username AS actor_name
    FROM activity_log a
    LEFT JOIN projects p ON a.project_id = p.id
    LEFT JOIN users u ON a.actor_id = u.id
    WHERE ${where}
    ORDER BY datetime(a.created_at) DESC
    LIMIT ?
  `).all(...params, limit);

  return rows.map(row => ({
    id: row.id,
    type: row.type,
    created_at: row.created_at,
    project_id: row.project_id,
    project_title: row.project_title,
    category: row.category,
    actor_id: row.actor_id,
    actor_name: row.actor_name,
    data: safeParse(row.data),
  }));
}

function safeParse(str) {
  try { return JSON.parse(str || '{}'); } catch { return {}; }
}

module.exports = { logActivity, getFeedForUser };
