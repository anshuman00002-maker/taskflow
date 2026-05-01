const { getDb } = require('../db');
const db = getDb();

/**
 * Checks that req.user is a member of the project.
 * Attaches req.memberRole = 'admin' | 'member'
 * Usage: router.use(requireMember)
 */
function requireMember(req, res, next) {
  const projectId = req.params.id || req.params.projectId;
  if (!projectId) return next(); // no project context, skip

  const row = db.prepare(`
    SELECT role FROM project_members
    WHERE project_id = ? AND user_id = ?
  `).get(projectId, req.user.id);

  if (!row) {
    return res.status(403).json({ success: false, error: 'Not a member of this project' });
  }

  req.memberRole = row.role;
  next();
}

/**
 * Checks that the current member is an admin of the project.
 * Must be used AFTER requireMember.
 */
function requireAdmin(req, res, next) {
  if (req.memberRole !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

module.exports = { requireMember, requireAdmin };
