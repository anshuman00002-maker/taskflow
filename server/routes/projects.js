const express = require('express');
const { getDb } = require('../db');
const db = getDb();
const { authenticate } = require('../middleware/auth');
const { requireMember, requireAdmin } = require('../middleware/roles');

const router = express.Router();
router.use(authenticate);

// ── GET /api/projects ─────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const projects = db.prepare(`
    SELECT
      p.id, p.name, p.description, p.created_at,
      pm.role,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) AS member_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id)           AS task_count,
      u.name AS owner_name
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    JOIN users u ON u.id = p.owner_id
    ORDER BY p.created_at DESC
  `).all(req.user.id);

  res.json({ success: true, data: { projects } });
});

// ── POST /api/projects ────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ success: false, error: 'Project name is required' });

  try {
    const proj = db.prepare(
      'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)'
    ).run(name.trim(), (description || '').trim(), req.user.id);

    const projectId = proj.lastInsertRowid;

    db.prepare(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
    ).run(projectId, req.user.id, 'admin');

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    res.status(201).json({ success: true, data: { project: { ...project, role: 'admin', member_count: 1, task_count: 0 } } });
  } catch (err) {
    console.error('[POST /projects]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ── GET /api/projects/:id ─────────────────────────────────────────────────────
router.get('/:id', requireMember, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, pm.role, pm.joined_at
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
    ORDER BY pm.role ASC, u.name ASC
  `).all(req.params.id);

  res.json({ success: true, data: { project: { ...project, role: req.memberRole }, members } });
});

// ── PUT /api/projects/:id ─────────────────────────────────────────────────────
router.put('/:id', requireMember, requireAdmin, (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ success: false, error: 'Project name is required' });

  db.prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?')
    .run(name.trim(), (description || '').trim(), req.params.id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: { project } });
});

// ── DELETE /api/projects/:id ──────────────────────────────────────────────────
router.delete('/:id', requireMember, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: { message: 'Project deleted' } });
});

module.exports = router;
