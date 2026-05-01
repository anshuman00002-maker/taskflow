const express = require('express');
const { getDb } = require('../db');
const db = getDb();
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── GET /api/dashboard ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const userId = req.user.id;
  const today  = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Summary stats across all user's projects
  const stats = db.prepare(`
    SELECT
      COUNT(*)                                                      AS total,
      SUM(CASE WHEN t.status = 'todo'        THEN 1 ELSE 0 END)    AS todo,
      SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END)    AS in_progress,
      SUM(CASE WHEN t.status = 'done'        THEN 1 ELSE 0 END)    AS done,
      SUM(CASE WHEN t.due_date < ? AND t.status != 'done' THEN 1 ELSE 0 END) AS overdue
    FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
  `).get(today, userId);

  // My assigned tasks
  const myTasks = db.prepare(`
    SELECT
      t.id, t.title, t.status, t.priority, t.due_date,
      p.name AS project_name,
      p.id   AS project_id
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.assigned_to = ?
    ORDER BY
      CASE WHEN t.due_date < ? AND t.status != 'done' THEN 0 ELSE 1 END,
      CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      t.due_date ASC NULLS LAST
    LIMIT 20
  `).all(userId, today);

  // Project-level breakdown
  const projects = db.prepare(`
    SELECT
      p.id, p.name,
      pm.role,
      COUNT(t.id)                                                   AS task_count,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END)           AS done_count,
      SUM(CASE WHEN t.due_date < ? AND t.status != 'done' THEN 1 ELSE 0 END) AS overdue_count
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    LEFT JOIN tasks t ON t.project_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT 10
  `).all(today, userId);

  res.json({
    success: true,
    data: {
      stats,
      myTasks,
      projects,
    }
  });
});

module.exports = router;
