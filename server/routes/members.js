const express = require('express');
const { getDb } = require('../db');
const db = getDb();
const { authenticate } = require('../middleware/auth');
const { requireMember, requireAdmin } = require('../middleware/roles');

const router = express.Router({ mergeParams: true });
router.use(authenticate);
router.use(requireMember);

// ── POST /api/projects/:id/members ────────────────────────────────────────────
// Invite a user by email (admin only)
router.post('/', requireAdmin, (req, res) => {
  const { email, role } = req.body;

  if (!email)
    return res.status(400).json({ success: false, error: 'Email is required' });

  const validRoles = ['admin', 'member'];
  const memberRole = validRoles.includes(role) ? role : 'member';

  // Find user by email
  const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?')
    .get(email.trim().toLowerCase());

  if (!user)
    return res.status(404).json({ success: false, error: 'No account found with that email' });

  // Check if already a member
  const existing = db.prepare(
    'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(req.params.id, user.id);

  if (existing)
    return res.status(409).json({ success: false, error: 'User is already a member' });

  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)')
    .run(req.params.id, user.id, memberRole);

  res.status(201).json({ success: true, data: { member: { ...user, role: memberRole } } });
});

// ── GET /api/projects/:id/members ─────────────────────────────────────────────
router.get('/', (req, res) => {
  const members = db.prepare(`
    SELECT u.id, u.name, u.email, pm.role, pm.joined_at
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
    ORDER BY pm.role ASC, u.name ASC
  `).all(req.params.id);

  res.json({ success: true, data: { members } });
});

// ── PATCH /api/projects/:id/members/:userId ───────────────────────────────────
// Change a member's role (admin only)
router.patch('/:userId', requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role))
    return res.status(400).json({ success: false, error: 'Role must be admin or member' });

  // Prevent demoting last admin
  if (role === 'member') {
    const adminCount = db.prepare(
      "SELECT COUNT(*) AS cnt FROM project_members WHERE project_id = ? AND role = 'admin'"
    ).get(req.params.id).cnt;

    const targetIsAdmin = db.prepare(
      "SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ? AND role = 'admin'"
    ).get(req.params.id, req.params.userId);

    if (adminCount <= 1 && targetIsAdmin)
      return res.status(400).json({ success: false, error: 'Cannot demote the last admin' });
  }

  const result = db.prepare(
    'UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?'
  ).run(role, req.params.id, req.params.userId);

  if (result.changes === 0)
    return res.status(404).json({ success: false, error: 'Member not found' });

  res.json({ success: true, data: { message: 'Role updated' } });
});

// ── DELETE /api/projects/:id/members/:userId ──────────────────────────────────
// Remove a member (admin only)
router.delete('/:userId', requireAdmin, (req, res) => {
  // Prevent removing last admin
  const adminCount = db.prepare(
    "SELECT COUNT(*) AS cnt FROM project_members WHERE project_id = ? AND role = 'admin'"
  ).get(req.params.id).cnt;

  const targetIsAdmin = db.prepare(
    "SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ? AND role = 'admin'"
  ).get(req.params.id, req.params.userId);

  if (adminCount <= 1 && targetIsAdmin)
    return res.status(400).json({ success: false, error: 'Cannot remove the last admin' });

  const result = db.prepare(
    'DELETE FROM project_members WHERE project_id = ? AND user_id = ?'
  ).run(req.params.id, req.params.userId);

  if (result.changes === 0)
    return res.status(404).json({ success: false, error: 'Member not found' });

  res.json({ success: true, data: { message: 'Member removed' } });
});

module.exports = router;
