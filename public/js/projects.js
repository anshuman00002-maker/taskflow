/**
 * projects.js — Projects list view
 * Matches real backend: GET /api/projects → { projects: [...] }
 * Fields: member_count, task_count, created_at, role
 */

function renderProjects() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="view-enter">
      <div class="view-header">
        <div>
          <h1>Projects</h1>
          <p>All your workspaces in one place.</p>
        </div>
        <button class="btn btn-primary" id="new-project-btn">
          <span id="new-project-icon" style="display:inline-block;transition:transform 0.3s ease">＋</span>
          New Project
        </button>
      </div>
      <div id="projects-grid" class="projects-grid">
        ${[0,1,2].map(() => `<div class="skeleton" style="height:180px;border-radius:var(--radius-md)"></div>`).join('')}
      </div>
    </div>
  `;
  attachRipples(app);
  document.getElementById('new-project-btn').addEventListener('click', openNewProjectModal);
  loadProjects();
}

async function loadProjects() {
  try {
    const data = await api.get('/projects');
    // Backend: { projects: [...] }
    const projects = data.projects || data || [];
    renderProjectGrid(Array.isArray(projects) ? projects : []);
  } catch (err) {
    showToast('Could not load projects: ' + err.message, 'error');
    renderProjectGrid([]);
  }
}

function renderProjectGrid(projects) {
  const grid = document.getElementById('projects-grid');
  if (!projects.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">📂</div>
        <div class="empty-title">No projects yet</div>
        <div class="empty-desc">Create your first project to get started.</div>
        <button class="btn btn-primary" id="empty-new-btn">＋ Create Project</button>
      </div>`;
    grid.querySelector('#empty-new-btn')?.addEventListener('click', openNewProjectModal);
    attachRipples(grid);
    return;
  }

  grid.innerHTML = projects.map((p, i) => `
    <div class="project-card view-enter" style="animation-delay:${i * 60}ms" data-id="${p.id}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <div class="project-name">${p.name}</div>
        ${roleBadge(p.role || 'member')}
      </div>
      <div class="project-desc">${p.description || 'No description.'}</div>
      <div class="project-meta">
        <div id="avstack-${p.id}"></div>
        <div class="project-stats">
          <span>📋 ${p.task_count ?? 0} tasks</span>
          <span>👥 ${p.member_count ?? 0} members</span>
        </div>
      </div>
      <div style="margin-top:12px;font-size:11px;color:var(--text-muted)">
        Created ${p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
      </div>
    </div>
  `).join('');

  // Fetch members for each project's avatar stack
  projects.forEach(p => {
    const avWrap = document.getElementById(`avstack-${p.id}`);
    if (avWrap && p.members) {
      avWrap.appendChild(createAvatarStack(p.members.map(m => m.name || m), 4));
    }
  });

  // Card click → board
  grid.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => {
      const proj = projects.find(p => String(p.id) === String(card.dataset.id));
      if (proj) {
        AppState.activeProject = { id: proj.id, name: proj.name };
        navigate(`/projects/${proj.id}`);
      }
    });
  });

  attachRipples(grid);
}

function openNewProjectModal() {
  const icon = document.getElementById('new-project-icon');
  if (icon) icon.style.transform = 'rotate(45deg)';

  const { close } = openModal({
    title: '📁 New Project',
    bodyHTML: `
      <div class="form-group">
        <label class="form-label" for="proj-name">Project Name</label>
        <input id="proj-name" class="form-input" type="text" placeholder="e.g. Marketing Campaign" required>
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label" for="proj-desc">Description</label>
        <textarea id="proj-desc" class="form-input" placeholder="What's this project about?" rows="3"></textarea>
      </div>
    `,
    footerHTML: `
      <button class="btn btn-secondary" id="modal-cancel-proj">Cancel</button>
      <button class="btn btn-primary"   id="modal-create-proj">Create Project</button>
    `,
    onClose: () => { if (icon) icon.style.transform = 'rotate(0deg)'; },
  });

  document.getElementById('modal-cancel-proj').addEventListener('click', close);

  const createBtn = document.getElementById('modal-create-proj');
  createBtn.addEventListener('click', async () => {
    const name = document.getElementById('proj-name').value.trim();
    const desc = document.getElementById('proj-desc').value.trim();
    if (!name) {
      const el = document.getElementById('proj-name');
      el.classList.add('error');
      el.style.animation = 'shake 0.3s ease';
      return;
    }
    createBtn.disabled = true;
    createBtn.innerHTML = '<div class="spinner spinner-sm" style="border-top-color:#fff"></div> Creating…';
    try {
      await api.post('/projects', { name, description: desc });
      showToast('Project created!', 'success');
      close();
      loadProjects();
    } catch (err) {
      showToast(err.message || 'Failed to create project', 'error');
      createBtn.disabled = false;
      createBtn.textContent = 'Create Project';
    }
  });
}
