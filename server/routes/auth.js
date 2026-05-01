const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { getDb } = require('../db');
const db = getDb();
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post('/signup', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ success: false, error: 'name, email and password are required' });

  if (password.length < 6)
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing)
    return res.status(409).json({ success: false, error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
  ).run(name.trim(), email.trim().toLowerCase(), hash);

  const user = { id: info.lastInsertRowid, name: name.trim(), email: email.trim().toLowerCase() };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({ success: true, data: { token, user } });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, error: 'email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user)
    return res.status(401).json({ success: false, error: 'Invalid email or password' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid)
    return res.status(401).json({ success: false, error: 'Invalid email or password' });

  const payload = { id: user.id, name: user.name, email: user.email };
  const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  res.json({ success: true, data: { token, user: payload } });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const { authenticate } = require('../middleware/auth');
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, data: { user } });
});

module.exports = router;
