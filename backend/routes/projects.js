const express = require('express');
const { v4: uuid } = require('uuid');
const { verifyToken } = require('@clerk/express');
const db = require('../db');
const auth = require('../middleware/auth');
const { logActivity } = require('../services/activity');
const { cleanUrl } = require('../lib/url');
const PROJECT_LINKS = ['repo_url', 'demo_url'];

const router = express.Router();

function recalcCost(projectId) {
  const items = db.prepare('SELECT total_cost FROM bom_items WHERE project_id=?').all(projectId);
  const total = items.reduce((s, i) => s + (i.total_cost || 0), 0);
  db.prepare("UPDATE projects SET total_cost=?, updated_at=datetime('now') WHERE id=?").run(total, projectId);
}

function getProgress(projectId) {
  const tasks = db.prepare('SELECT is_done FROM tasks WHERE project_id=?').all(projectId);
  if (!tasks.length) return 0;
  return Math.round((tasks.filter(t => t.is_done).length / tasks.length) * 100);
}

async function getViewerId(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    const token = header.split(' ')[1];
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return payload.sub;
  } catch {
    return null;
  }
}

function decorateProject(project, viewerId) {
  const followers = db.prepare('SELECT COUNT(*) as c FROM follows_projects WHERE project_id=?').get(project.id).c || 0;
  let isFollowingProject = false;
  let isFollowingCreator = false;
  const creatorDisplayName = project.display_name || project.username;
  if (viewerId) {
    isFollowingProject = !!db.prepare('SELECT 1 FROM follows_projects WHERE user_id=? AND project_id=?').get(viewerId, project.id);
    if (project.user_id !== viewerId) {
      isFollowingCreator = !!db.prepare('SELECT 1 FROM follows_users WHERE follower_id=? AND following_id=?').get(viewerId, project.user_id);
    }
  }
  return {
    ...project,
    creator_display_name: creatorDisplayName,
    followers_count: followers,
    is_following_project: isFollowingProject,
    is_following_creator: isFollowingCreator,
  };
}

// Public gallery
router.get('/public', async (req, res) => {
  const viewerId = await getViewerId(req);
  const projects = db.prepare(`
    SELECT p.*, u.username, u.display_name, u.avatar_url FROM projects p
    JOIN users u ON p.user_id = u.id
    WHERE p.is_public=1 ORDER BY p.updated_at DESC
  `).all();
  res.json(projects.map(p => ({ ...decorateProject(p, viewerId), progress: getProgress(p.id) })));
});

// My projects
router.get('/', auth, (req, res) => {
  const projects = db.prepare('SELECT p.*, u.display_name, u.username FROM projects p JOIN users u ON p.user_id=u.id WHERE p.user_id=? ORDER BY p.updated_at DESC').all(req.user.id);
  res.json(projects.map(p => ({ ...decorateProject(p, req.user.id), progress: getProgress(p.id) })));
});

// Get single project (public or owned)
router.get('/:id', async (req, res) => {
  const project = db.prepare('SELECT p.*, u.username, u.avatar_url FROM projects p JOIN users u ON p.user_id=u.id WHERE p.id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const viewerId = await getViewerId(req);
  if (!project.is_public && project.user_id !== viewerId) return res.status(403).json({ error: 'Private project' });

  const bom = db.prepare('SELECT * FROM bom_items WHERE project_id=?').all(project.id);
  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id=? ORDER BY sort_order').all(project.id);
  const files = db.prepare('SELECT * FROM project_files WHERE project_id=?').all(project.id);
  const progress = getProgress(project.id);

  res.json({ ...decorateProject(project, viewerId), bom, tasks, files, progress });
});

// Create project
router.post('/', auth, (req, res) => {
  const { title, description, status, is_public, category, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = uuid();
  db.prepare(`INSERT INTO projects (id, user_id, title, description, status, is_public, category, tags)
    VALUES (?,?,?,?,?,?,?,?)`).run(id, req.user.id, title, description || '', status || 'draft', is_public ? 1 : 0, category || 'general', JSON.stringify(tags || []));
  res.json(db.prepare('SELECT * FROM projects WHERE id=?').get(id));
});

// Update project
router.put('/:id', auth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const { title, description, status, is_public, category, cover_url, tags } = req.body;

  // Proof links shown as buttons on the project page (code repo, demo video)
  for (const f of PROJECT_LINKS) {
    if (req.body[f] === undefined) continue;
    const v = cleanUrl(req.body[f]);
    if (v === null) return res.status(400).json({ error: `${f} must be a valid http(s) link` });
    db.prepare(`UPDATE projects SET ${f}=? WHERE id=?`).run(v, req.params.id);
  }

  // Featured projects are pinned to the top of the public profile (max 6).
  if (req.body.is_featured !== undefined) {
    const want = req.body.is_featured ? 1 : 0;
    if (want && !project.is_featured) {
      const count = db.prepare('SELECT COUNT(*) AS c FROM projects WHERE user_id=? AND is_featured=1').get(req.user.id).c;
      if (count >= 6) return res.status(400).json({ error: 'You can feature up to 6 projects' });
    }
    db.prepare('UPDATE projects SET is_featured=? WHERE id=?').run(want, req.params.id);
  }
  if (req.body.featured_order !== undefined) {
    db.prepare('UPDATE projects SET featured_order=? WHERE id=?').run(Number(req.body.featured_order) || 0, req.params.id);
  }

  let statusChanged = false;
  // When marking complete: deduct BOM quantities from inventory stock
  if (status && status !== project.status) {
    statusChanged = true;
    // Marking complete consumes BOM parts from inventory; leaving 'complete' gives them back,
    // so toggling the status back and forth never deducts the same parts twice.
    const sign = status === 'complete' ? -1 : project.status === 'complete' ? 1 : 0;
    if (sign !== 0) {
      const bomItems = db.prepare('SELECT * FROM bom_items WHERE project_id=?').all(req.params.id);
      for (const item of bomItems) {
        if (item.part_id) {
          db.prepare('UPDATE inventory_parts SET stock_qty = MAX(0, stock_qty + ?) WHERE id=? AND user_id=?')
            .run(sign * (item.qty || 0), item.part_id, req.user.id);
        }
      }
    }
  }

  db.prepare(`UPDATE projects SET title=COALESCE(?,title), description=COALESCE(?,description),
    status=COALESCE(?,status), is_public=COALESCE(?,is_public), category=COALESCE(?,category),
    cover_url=COALESCE(?,cover_url), tags=COALESCE(?,tags), updated_at=datetime('now') WHERE id=?`)
    .run(title, description, status, is_public != null ? (is_public ? 1 : 0) : null, category, cover_url, tags !== undefined ? JSON.stringify(tags) : null, req.params.id);

  if (statusChanged) {
    logActivity({ actorId: req.user.id, projectId: req.params.id, type: 'status_change', data: { status } });
  }

  res.json(db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id));
});

// Delete project
router.delete('/:id', auth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const pid = req.params.id;
  db.transaction(() => {
    db.prepare('DELETE FROM post_comments WHERE post_id IN (SELECT id FROM posts WHERE project_id=?)').run(pid);
    for (const t of ['posts','bom_items','tasks','project_files','follows_projects','points_transactions','activity_log','time_logs','achievements']) {
      db.prepare(`DELETE FROM ${t} WHERE project_id=?`).run(pid);
    }
    db.prepare('UPDATE community_posts SET project_id=NULL WHERE project_id=?').run(pid);
    db.prepare('DELETE FROM projects WHERE id=?').run(pid);
  })();
  res.json({ ok: true });
});

// --- BOM ---
router.get('/:id/bom', async (req, res) => {
  const project = db.prepare('SELECT user_id, is_public FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const viewerId = await getViewerId(req);
  if (!project.is_public && project.user_id !== viewerId) return res.status(403).json({ error: 'Private project' });
  res.json(db.prepare('SELECT * FROM bom_items WHERE project_id=?').all(req.params.id));
});

router.post('/:id/bom', auth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!project) return res.status(403).json({ error: 'Forbidden' });
  const { name, qty, unit, unit_cost, supplier, supplier_url, part_id, is_3d_printed, filament_type, filament_grams, filament_cost_per_kg, notes } = req.body;
  if (part_id && !db.prepare('SELECT 1 FROM inventory_parts WHERE id=? AND user_id=?').get(part_id, req.user.id)) {
    return res.status(400).json({ error: 'Unknown inventory part' });
  }
  const id = uuid();
  let totalCost = (qty || 1) * (unit_cost || 0);
  if (is_3d_printed) {
    totalCost = ((filament_grams || 0) / 1000) * (filament_cost_per_kg || 0);
  }
  db.prepare(`INSERT INTO bom_items (id,project_id,part_id,name,qty,unit,unit_cost,total_cost,supplier,supplier_url,is_3d_printed,filament_type,filament_grams,filament_cost_per_kg,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, req.params.id, part_id||null, name, qty||1, unit||'pcs', unit_cost||0, totalCost, supplier||'', supplier_url||'', is_3d_printed?1:0, filament_type||'', filament_grams||0, filament_cost_per_kg||0, notes||'');
  recalcCost(req.params.id);
  res.json(db.prepare('SELECT * FROM bom_items WHERE id=?').get(id));
});

router.put('/:id/bom/:bomId', auth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!project) return res.status(403).json({ error: 'Forbidden' });
  const existing = db.prepare('SELECT * FROM bom_items WHERE id=? AND project_id=?').get(req.params.bomId, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  // Merge: fields missing from the body keep their current value (a partial update must not reset cost).
  const fields = ['name','qty','unit','unit_cost','supplier','supplier_url','is_3d_printed','filament_type','filament_grams','filament_cost_per_kg','notes'];
  const m = { ...existing };
  for (const f of fields) if (req.body[f] !== undefined) m[f] = req.body[f];
  m.is_3d_printed = m.is_3d_printed ? 1 : 0;
  const totalCost = m.is_3d_printed
    ? ((m.filament_grams || 0) / 1000) * (m.filament_cost_per_kg || 0)
    : (m.qty || 1) * (m.unit_cost || 0);
  db.prepare(`UPDATE bom_items SET name=?,qty=?,unit=?,unit_cost=?,total_cost=?,supplier=?,supplier_url=?,
    is_3d_printed=?,filament_type=?,filament_grams=?,filament_cost_per_kg=?,notes=? WHERE id=? AND project_id=?`)
    .run(m.name, m.qty, m.unit, m.unit_cost, totalCost, m.supplier, m.supplier_url, m.is_3d_printed,
      m.filament_type, m.filament_grams, m.filament_cost_per_kg, m.notes, req.params.bomId, req.params.id);
  recalcCost(req.params.id);
  res.json(db.prepare('SELECT * FROM bom_items WHERE id=? AND project_id=?').get(req.params.bomId, req.params.id));
});

router.delete('/:id/bom/:bomId', auth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!project) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM bom_items WHERE id=? AND project_id=?').run(req.params.bomId, req.params.id);
  recalcCost(req.params.id);
  res.json({ ok: true });
});

// --- Tasks ---
router.post('/:id/tasks', auth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!project) return res.status(403).json({ error: 'Forbidden' });
  const { title, category } = req.body;
  const id = uuid();
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM tasks WHERE project_id=?').get(req.params.id).m || 0;
  db.prepare('INSERT INTO tasks (id,project_id,title,category,sort_order) VALUES (?,?,?,?,?)')
    .run(id, req.params.id, title, category || 'general', maxOrder + 1);
  res.json(db.prepare('SELECT * FROM tasks WHERE id=?').get(id));
});

router.put('/:id/tasks/:taskId', auth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!project) return res.status(403).json({ error: 'Forbidden' });
  const { title, is_done, category } = req.body;
  const existing = db.prepare('SELECT * FROM tasks WHERE id=? AND project_id=?').get(req.params.taskId, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  db.prepare('UPDATE tasks SET title=COALESCE(?,title),is_done=COALESCE(?,is_done),category=COALESCE(?,category) WHERE id=? AND project_id=?')
    .run(title, is_done != null ? (is_done ? 1 : 0) : null, category, req.params.taskId, req.params.id);
  const updated = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.taskId);
  if (existing && updated && !existing.is_done && updated.is_done) {
    logActivity({ actorId: req.user.id, projectId: req.params.id, type: 'task_completed', data: { taskId: updated.id, title: updated.title } });
    // Optionally publish as a post
    const { publish, caption } = req.body;
    if (publish === true || publish === 'true') {
      const { v4: postUuid } = require('uuid');
      db.prepare('INSERT INTO posts (id, project_id, user_id, type, data, caption) VALUES (?,?,?,?,?,?)')
        .run(postUuid(), req.params.id, req.user.id, 'task_completed',
          JSON.stringify({ taskId: updated.id, title: updated.title, category: updated.category }),
          caption || '');
    }
  }
  res.json(updated);
});

router.delete('/:id/tasks/:taskId', auth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!project) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM tasks WHERE id=? AND project_id=?').run(req.params.taskId, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
