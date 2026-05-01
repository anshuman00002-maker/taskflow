/**
 * dashboard.js — Dashboard view
 * Matches real backend: GET /api/dashboard → { stats, myTasks, projects }
 * Field names: in_progress, project_name, project_id, due_date
 */

function animateCounter(el, target) {
  let start = 0;
  const step = () => {
    start += Math.ceil((target - start) / 8);
    el.textContent = start;
    if (start < target) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

function renderProgressRing(pct) {
  const R = 54, C = 2 * Math.PI * R;
  return `
    <svg width="130" height="130" viewBox="0 0 130 130">
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stop-color="#6c63ff"/>
          <stop offset="100%" stop-color="#00d4aa"/>
        </linearGradient>
      </defs>
      <circle class="progress-ring-track" cx="65" cy="65" r="${R}" stroke-width="10"/>
      <circle class="progress-ring progress-ring-fill" cx="65" cy="65" r="${R}"
              stroke-width="10"
              stroke-dasharray="${C}"
              stroke-dashoffset="${C}"
              id="ring-fill"
              transform="rotate(-90 65 65)"/>
      <text x="65" y="60" text-anchor="middle" fill="var(--text-primary)" font-size="22" font-weight="800" font-family="Inter">${pct}%</text>
      <text x="65" y="78" text-anchor="middle" fill="var(--text-muted)" font-size="11" font-family="Inter">Done</text>
    </svg>`;
}

function renderDashboard() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="view-enter">
      <div class="view-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Here's what's happening.</p>
        </div>
        <button class="btn btn-primary" onclick="navigate('/projects')">📁 View Projects</button>
      </div>

      <div class="stat-cards" id="stat-cards">
        ${[0,1,2,3,4].map(() => `<div class="skeleton" style="height:120px;border-radius:var(--radius-md)"></div>`).join('')}
      </div>

      <div class="dashboard-grid">
        <div class="section-card">
          <div class="section-title">📋 My Tasks</div>
          <div id="my-tasks-wrap"><div class="loading-wrap"><div class="spinner"></div><span>Loading…</span></div></div>
        </div>
        <div>
          <div class="section-card" style="text-align:center;margin-bottom:20px;">
            <div class="section-title" style="justify-content:center;">📈 Completion</div>
            <div id="ring-wrap" style="display:flex;justify-content:center;padding:8px 0;"></div>
          </div>
          <div class="section-card">
            <div class="section-title">🗂️ Projects Overview</div>
            <div id="projects-overview"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  attachRipples(app);
  loadDashboard();
}

async function loadDashboard() {
  try {
    const data = await api.get('/dashboard');
    // Real backend: data = { stats, myTasks, projects }
    const stats    = data.stats    || {};
    const myTasks  = data.myTasks  || [];
    const projects = data.projects || [];

    renderStatCards(stats);
    renderMyTasks(myTasks);
    renderProjectsOverview(projects);
    renderRing(stats);
  } catch (err) {
    showToast('Could not load dashboard: ' + err.message, 'error');
    renderStatCards({});
    renderMyTasks([]);
    renderProjectsOverview([]);
    renderRing({});
  }
}

const STAT_DEFS = [
  { key:'total',       label:'Total Tasks',  icon:'📌', color:'#6c63ff' },
  { key:'todo',        label:'To Do',        icon:'📝', color:'#8892a4' },
  { key:'in_progress', label:'In Progress',  icon:'⚙️', color:'#f59e0b' },
  { key:'done',        label:'Done',         icon:'✅', color:'#00d4aa' },
  { key:'overdue',     label:'Overdue',      icon:'🔥', color:'#ef4444' },
];

function renderStatCards(stats) {
  const wrap = document.getElementById('stat-cards');
  wrap.innerHTML = STAT_DEFS.map((s, i) => `
    <div class="stat-card" style="animation-delay:${i * 80}ms;animation:fadeSlideIn 0.4s ease both">
      <div class="stat-icon" style="background:${s.color}22;color:${s.color}">${s.icon}</div>
      <div class="stat-number" id="stat-${s.key}" data-target="${stats[s.key] || 0}">0</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');

  STAT_DEFS.forEach(s => {
    const el = document.getElementById(`stat-${s.key}`);
    if (el) animateCounter(el, parseInt(el.dataset.target) || 0);
  });
}

function renderMyTasks(tasks) {
  const wrap = document.getElementById('my-tasks-wrap');
  if (!tasks.length) {
    wrap.innerHTML = `<div class="empty-state" style="padding:32px"><div class="empty-icon">🎉</div><div class="empty-title">All clear!</div><div class="empty-desc">No tasks assigned to you.</div></div>`;
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  wrap.innerHTML = `
    <div class="table-wrap scrollbar-thin">
      <table>
        <thead><tr>
          <th>Task</th><th>Project</th><th>Priority</th><th>Status</th><th>Due</th>
        </tr></thead>
        <tbody>
          ${tasks.map(t => {
            // Backend field names: project_name, project_id, due_date, in_progress status
            const isOverdue = t.status !== 'done' && t.due_date && t.due_date < today;
            const displayStatus = isOverdue ? 'overdue' : t.status;
            // Normalise in_progress → in-progress for badge
            const badgeStatus = displayStatus === 'in_progress' ? 'in-progress' : displayStatus;
            return `
            <tr class="${isOverdue ? 'overdue-row' : ''}" style="cursor:pointer"
                onclick="navigate('/projects/${t.project_id}')">
              <td><span style="font-weight:600">${t.title}</span></td>
              <td><span class="text-sm text-secondary">${t.project_name || '—'}</span></td>
              <td style="display:flex;align-items:center;gap:6px;padding-top:18px">${priorityDot(t.priority)}<span class="text-xs text-secondary">${t.priority || '—'}</span></td>
              <td>${statusBadge(badgeStatus)}</td>
              <td class="text-sm text-muted">${t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderProjectsOverview(projects) {
  const wrap = document.getElementById('projects-overview');
  if (!projects.length) {
    wrap.innerHTML = `<div class="text-sm text-muted" style="padding:8px 0">No projects yet. <a href="#" onclick="navigate('/projects')" style="color:var(--accent)">Create one →</a></div>`;
    return;
  }
  wrap.innerHTML = projects.map(p => {
    const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
    return `
      <div style="margin-bottom:14px;cursor:pointer" onclick="navigate('/projects/${p.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span class="text-sm fw-600">${p.name}</span>
          <span class="text-xs text-muted">${p.done_count || 0}/${p.task_count || 0} done</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar" id="pb-${p.id}" style="width:0%"></div>
        </div>
        ${p.overdue_count > 0 ? `<div class="text-xs" style="color:var(--danger);margin-top:4px;">⚠ ${p.overdue_count} overdue</div>` : ''}
      </div>
    `;
  }).join('');

  // Animate progress bars
  projects.forEach(p => {
    const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
    setTimeout(() => {
      const bar = document.getElementById(`pb-${p.id}`);
      if (bar) bar.style.width = pct + '%';
    }, 50);
  });
}

function renderRing(stats) {
  const total = stats.total || 0;
  const done  = stats.done  || 0;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const wrap  = document.getElementById('ring-wrap');
  if (!wrap) return;
  wrap.innerHTML = renderProgressRing(pct);
  setTimeout(() => {
    const fill = document.getElementById('ring-fill');
    if (fill) {
      const R = 54, C = 2 * Math.PI * R;
      fill.style.strokeDashoffset = C - (pct / 100) * C;
      fill.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)';
    }
  }, 50);
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
