const express = require('express');
const { getDb } = require('../db');
const db = getDb();
const { authenticate } = require('../middleware/auth');
const { requireMember, requireAdmin } = require('../middleware/roles');

const router = express.Router({ mergeParams: true });
router.use(authenticate);
router.use(requireMember);

// ── GET /api/projects/:id/tasks ───────────────────────────────────────────────
router.get('/', (req, res) => {
  const tasks = db.prepare(`
    SELECT
      t.*,
      u.name  AS assigned_to_name,
      u.email AS assigned_to_email,
      c.name  AS created_by_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    LEFT JOIN users c ON c.id = t.created_by
    WHERE t.project_id = ?
    ORDER BY
      CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      t.due_date ASC NULLS LAST,
      t.created_at DESC
  `).all(req.params.id);

  res.json({ success: true, data: { tasks } });
});

// ── POST /api/projects/:id/tasks ──────────────────────────────────────────────
router.post('/', requireAdmin, (req, res) => {
  const { title, description, assigned_to, priority, due_date } = req.body;

  if (!title || !title.trim())
    return res.status(400).json({ success: false, error: 'Task title is required' });

  // Validate assignee is a project member
  if (assigned_to) {
    const isMember = db.prepare(
      'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(req.params.id, assigned_to);
    if (!isMember)
      return res.status(400).json({ success: false, error: 'Assignee is not a project member' });
  }

  const validPriorities = ['low', 'medium', 'high'];
  const taskPriority = validPriorities.includes(priority) ? priority : 'medium';

  const info = db.prepare(`
    INSERT INTO tasks (project_id, title, description, assigned_to, priority, due_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.id,
    title.trim(),
    (description || '').trim(),
    assigned_to || null,
    taskPriority,
    due_date || null,
    req.user.id
  );

  const task = db.prepare(`
    SELECT t.*, u.name AS assigned_to_name, c.name AS created_by_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    LEFT JOIN users c ON c.id = t.created_by
    WHERE t.id = ?
  `).get(info.lastInsertRowid);

  res.status(201).json({ success: true, data: { task } });
});

// ── PUT /api/tasks/:taskId ────────────────────────────────────────────────────
// Admins: update all fields. Members: update status only.
const taskRouter = express.Router();
taskRouter.use(authenticate);

taskRouter.put('/:taskId', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

  // Check membership in the task's project
  const membership = db.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(task.project_id, req.user.id);

  if (!membership)
    return res.status(403).json({ success: false, error: 'Not a member of this project' });

  const isAdmin = membership.role === 'admin';
  const validStatuses   = ['todo', 'in_progress', 'done'];
  const validPriorities = ['low', 'medium', 'high'];

  if (isAdmin) {
    // Admins can update everything
    const { title, description, assigned_to, status, priority, due_date } = req.body;

    if (!title || !title.trim())
      return res.status(400).json({ success: false, error: 'Task title is required' });
    if (status && !validStatuses.includes(status))
      return res.status(400).json({ success: false, error: 'Invalid status' });
    if (priority && !validPriorities.includes(priority))
      return res.status(400).json({ success: false, error: 'Invalid priority' });

    // Validate assignee
    if (assigned_to) {
      const isMember = db.prepare(
        'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
      ).get(task.project_id, assigned_to);
      if (!isMember)
        return res.status(400).json({ success: false, error: 'Assignee is not a project member' });
    }

    db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, assigned_to = ?, status = ?, priority = ?, due_date = ?
      WHERE id = ?
    `).run(
      title.trim(),
      (description || '').trim(),
      assigned_to || null,
      status || task.status,
      priority || task.priority,
      due_date !== undefined ? due_date : task.due_date,
      req.params.taskId
    );
  } else {
    // Members can only update status
    const { status } = req.body;
    if (!status || !validStatuses.includes(status))
      return res.status(400).json({ success: false, error: 'Invalid or missing status' });

    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, req.params.taskId);
  }

  const updated = db.prepare(`
    SELECT t.*, u.name AS assigned_to_name, c.name AS created_by_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    LEFT JOIN users c ON c.id = t.created_by
    WHERE t.id = ?
  `).get(req.params.taskId);

  res.json({ success: true, data: { task: updated } });
});

// ── DELETE /api/tasks/:taskId ─────────────────────────────────────────────────
taskRouter.delete('/:taskId', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

  const membership = db.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(task.project_id, req.user.id);

  if (!membership || membership.role !== 'admin')
    return res.status(403).json({ success: false, error: 'Admin access required' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  res.json({ success: true, data: { message: 'Task deleted' } });
});

module.exports = { projectTaskRouter: router, taskRouter };
