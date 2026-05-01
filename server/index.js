const express = require('express');
const path    = require('path');
const cors    = require('cors');
const { init } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Boot DB first, then mount routes
init().then(() => {
  const authRoutes    = require('./routes/auth');
  const projectRoutes = require('./routes/projects');
  const memberRoutes  = require('./routes/members');
  const dashRoutes    = require('./routes/dashboard');
  const { projectTaskRouter, taskRouter } = require('./routes/tasks');

  app.use('/api/auth',               authRoutes);
  app.use('/api/dashboard',          dashRoutes);
  app.use('/api/projects',           projectRoutes);
  app.use('/api/projects/:id/members', memberRoutes);
  app.use('/api/projects/:id/tasks', projectTaskRouter);
  app.use('/api/tasks',              taskRouter);

  app.get('/api/health', (req, res) => {
    res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`\n🚀 TaskFlow → http://localhost:${PORT}\n`);
  });
}).catch(err => {
  console.error('[FATAL] DB init failed:', err);
  process.exit(1);
});
