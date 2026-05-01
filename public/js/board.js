/**
 * board.js — Kanban board view
 * Matches real backend:
 *   GET  /api/projects/:id/tasks  → { tasks: [...] }   (also fetches members via GET /api/projects/:id)
 *   POST /api/projects/:id/tasks  → body: { title, description, assigned_to, priority, due_date }
 *   PUT  /api/tasks/:id           → body: { title, description, assigned_to, status, priority, due_date }
 *   DELETE /api/tasks/:id
 *   POST /api/projects/:id/members → body: { email }
 * Task fields: assigned_to (id), assigned_to_name, status ('todo'|'in_progress'|'done'), due_date
 */

let _boardProjectId = null;
let _boardProject   = null;
let _boardMembers   = [];

function renderBoard(projectId) {
  _boardProjectId = projectId;
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="view-enter" id="board-view">
      <div class="board-header">
        <div>
          <h1 id="board-title">Loading…</h1>
          <div id="board-members-row" style="margin-top:8px;display:flex;align-items:center;gap:12px;"></div>
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-secondary btn-sm" id="members-toggle-btn">👥 Members</button>
          <button class="btn btn-primary   btn-sm" id="add-task-header-btn">＋ Add Task</button>
        </div>
      </div>

      <div class="kanban-wrap scrollbar-thin" id="kanban-wrap">
        ${['todo','in_progress','done'].map((col, i) => `
          <div class="kanban-col" style="animation:fadeSlideIn 0.4s ease both;animation-delay:${i*100}ms" id="kanban-col-${col}">
            <div class="col-header">
              <span class="col-title">
                <span style="color:${col==='todo'?'var(--text-secondary)':col==='in_progress'?'var(--warn)':'var(--accent-2)'}">●</span>
                ${col==='todo'?'To Do':col==='in_progress'?'In Progress':'Done'}
              </span>
              <span class="col-count skeleton" style="width:24px;height:20px" id="count-${col}"></span>
            </div>
            <div class="col-body scrollbar-thin" id="col-${col}">
              ${[0,1].map(() => `<div class="skeleton skeleton-card" style="height:90px;margin-bottom:10px"></div>`).join('')}
            </div>
            <div class="col-footer">
              <button class="add-task-btn" data-col="${col}">＋ Add Task</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Members slide panel -->
    <div class="members-panel" id="members-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h3>👥 Members</h3>
        <button class="btn btn-ghost btn-icon" id="panel-close">✕</button>
      </div>
      <div id="members-list" style="flex:1;overflow-y:auto;"></div>
      <div class="divider"></div>
      <div class="form-group" style="margin-bottom:8px">
        <label class="form-label">Invite by Email</label>
        <input id="invite-email" class="form-input" type="email" placeholder="user@example.com">
      </div>
      <button class="btn btn-primary w-full" id="invite-btn" style="justify-content:center;">Invite</button>
    </div>
  `;

  attachRipples(app);

  document.getElementById('members-toggle-btn').addEventListener('click', () =>
    document.getElementById('members-panel').classList.toggle('open'));
  document.getElementById('panel-close').addEventListener('click', () =>
    document.getElementById('members-panel').classList.remove('open'));

  document.getElementById('add-task-header-btn').addEventListener('click', () => openTaskModal(null, 'todo'));
  document.querySelectorAll('.add-task-btn').forEach(btn =>
    btn.addEventListener('click', () => openTaskModal(null, btn.dataset.col)));

  document.getElementById('invite-btn').addEventListener('click', inviteMember);

  loadBoard(projectId);
}

async function loadBoard(projectId) {
  try {
    // Fetch project info + members from GET /api/projects/:id
    const projData = await api.get(`/projects/${projectId}`);
    // projData = { project: {...}, members: [...] }  OR just the project object
    _boardProject = projData.project || projData;
    _boardMembers = projData.members || [];

    document.getElementById('board-title').textContent = _boardProject.name || 'Project Board';

    // Update sidebar active project
    AppState.activeProject = { id: projectId, name: _boardProject.name };
    renderSidebar(window.location.pathname);

    // Members header row
    const row = document.getElementById('board-members-row');
    row.innerHTML = '';
    if (_boardMembers.length) {
      row.appendChild(createAvatarStack(_boardMembers.map(m => m.name), 5));
      const ml = document.createElement('span');
      ml.className = 'text-sm text-muted';
      ml.textContent = `${_boardMembers.length} member${_boardMembers.length !== 1 ? 's' : ''}`;
      row.appendChild(ml);
    }

    renderMembersList(_boardMembers);

    // Fetch tasks
    const taskData = await api.get(`/projects/${projectId}/tasks`);
    // taskData = { tasks: [...] }
    const tasks = taskData.tasks || taskData || [];

    // Group by status
    const cols = { todo: [], in_progress: [], done: [] };
    tasks.forEach(t => {
      const col = cols[t.status] ? t.status : 'todo';
      cols[col].push(t);
    });
    Object.entries(cols).forEach(([col, colTasks]) => renderColumn(col, colTasks));

  } catch (err) {
    showToast('Could not load board: ' + err.message, 'error');
  }
}

function renderColumn(col, tasks) {
  const body  = document.getElementById(`col-${col}`);
  const count = document.getElementById(`count-${col}`);
  if (!body) return;

  if (count) { count.className = 'col-count'; count.textContent = tasks.length; }

  body.innerHTML = '';

  if (!tasks.length) {
    const empty = document.createElement('div');
    empty.className = 'text-sm text-muted';
    empty.style.cssText = 'padding:20px;text-align:center;opacity:0.5';
    empty.textContent = 'Drop tasks here';
    body.appendChild(empty);
  } else {
    tasks.forEach(task => body.appendChild(createTaskCard(task)));
  }

  // DnD on column drop zone
  body.addEventListener('dragover', e => {
    e.preventDefault();
    body.closest('.kanban-col').classList.add('drag-over');
  });
  body.addEventListener('dragleave', () =>
    body.closest('.kanban-col').classList.remove('drag-over'));
  body.addEventListener('drop', e => {
    e.preventDefault();
    body.closest('.kanban-col').classList.remove('drag-over');
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) updateTaskStatus(taskId, col);
  });
}

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.draggable  = true;
  card.dataset.id = task.id;

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = task.status !== 'done' && task.due_date && task.due_date < today;

  // assignee comes as assigned_to_name from backend
  const assigneeName = task.assigned_to_name || '';

  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px;">
      <span class="task-title">${task.title}</span>
      ${priorityDot(task.priority || 'medium')}
    </div>
    ${task.description ? `<div class="text-xs text-muted" style="margin-bottom:8px;line-height:1.4">${task.description.slice(0,80)}${task.description.length > 80 ? '…' : ''}</div>` : ''}
    <div class="task-footer">
      <div class="due-chip ${isOverdue ? 'overdue' : ''}">📅 ${task.due_date || '—'}</div>
      <div style="display:flex;align-items:center;gap:6px;">
        ${assigneeName ? createAvatar(assigneeName, 'avatar-sm').outerHTML : ''}
        <button class="btn btn-ghost btn-icon btn-sm" data-action="edit"   style="width:26px;height:26px;font-size:12px" title="Edit">✏️</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="delete" style="width:26px;height:26px;font-size:12px" title="Delete">🗑️</button>
      </div>
    </div>
  `;

  // DnD
  card.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', task.id);
    setTimeout(() => card.classList.add('dragging'), 0);
  });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));

  card.querySelector('[data-action="edit"]').addEventListener('click', e => {
    e.stopPropagation();
    openTaskModal(task);
  });
  card.querySelector('[data-action="delete"]').addEventListener('click', async e => {
    e.stopPropagation();
    const ok = await confirmDialog(`Delete task "${task.title}"?`);
    if (!ok) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      showToast('Task deleted', 'success');
      loadBoard(_boardProjectId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  return card;
}

async function updateTaskStatus(taskId, newStatus) {
  try {
    // PUT /api/tasks/:id — members can only update status
    await api.put(`/tasks/${taskId}`, { status: newStatus });
    showToast('Task moved!', 'success');
    loadBoard(_boardProjectId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderMembersList(members) {
  const list = document.getElementById('members-list');
  if (!list) return;
  list.innerHTML = members.map(m => `
    <div class="member-item">
      ${createAvatar(m.name || '?').outerHTML}
      <div class="member-info">
        <div class="member-name">${m.name || '—'}</div>
        <div class="member-email">${m.email || ''}</div>
      </div>
      ${roleBadge(m.role || 'member')}
    </div>
  `).join('');
}

async function inviteMember() {
  const input = document.getElementById('invite-email');
  const email = input?.value.trim();
  if (!email) { if (input) input.classList.add('error'); return; }
  input.classList.remove('error');
  try {
    await api.post(`/projects/${_boardProjectId}/members`, { email });
    showToast('Member invited!', 'success');
    input.value = '';
    loadBoard(_boardProjectId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openTaskModal(task = null, defaultStatus = 'todo') {
  const isEdit   = !!task;
  const userRole = _boardMembers.find(m => m.id === Auth.getUser()?.id)?.role || 'member';
  const isAdmin  = userRole === 'admin';

  // Members can only change status (not create/full-edit)
  if (!isAdmin && !isEdit) {
    showToast('Only admins can create tasks', 'info');
    return;
  }

  const { close } = openModal({
    title: isEdit ? '✏️ Edit Task' : '＋ New Task',
    bodyHTML: `
      <div class="form-group">
        <label class="form-label">Title</label>
        <input id="task-title" class="form-input" type="text" placeholder="Task title"
               value="${task?.title || ''}" ${!isAdmin ? 'disabled' : ''} required>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea id="task-desc" class="form-input" rows="3" placeholder="Optional"
                  ${!isAdmin ? 'disabled' : ''}>${task?.description || ''}</textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Status</label>
          <select id="task-status" class="form-input">
            <option value="todo"        ${(task?.status||defaultStatus)==='todo'?'selected':''}>To Do</option>
            <option value="in_progress" ${task?.status==='in_progress'?'selected':''}>In Progress</option>
            <option value="done"        ${task?.status==='done'?'selected':''}>Done</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Priority</label>
          <select id="task-priority" class="form-input" ${!isAdmin ? 'disabled' : ''}>
            <option value="low"    ${task?.priority==='low'?'selected':''}>Low</option>
            <option value="medium" ${!task?.priority||task?.priority==='medium'?'selected':''}>Medium</option>
            <option value="high"   ${task?.priority==='high'?'selected':''}>High</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Due Date</label>
          <input id="task-due" class="form-input" type="date"
                 value="${task?.due_date ? task.due_date.slice(0,10) : ''}"
                 ${!isAdmin ? 'disabled' : ''}>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Assignee</label>
          <select id="task-assignee" class="form-input" ${!isAdmin ? 'disabled' : ''}>
            <option value="">Unassigned</option>
            ${_boardMembers.map(m =>
              `<option value="${m.id}" ${task?.assigned_to === m.id ? 'selected' : ''}>${m.name}</option>`
            ).join('')}
          </select>
        </div>
      </div>
    `,
    footerHTML: `
      <button class="btn btn-secondary" id="task-cancel">Cancel</button>
      <button class="btn btn-primary"   id="task-save">${isEdit ? 'Save Changes' : 'Create Task'}</button>
    `,
  });

  document.getElementById('task-cancel').addEventListener('click', close);
  document.getElementById('task-save').addEventListener('click', async () => {
    const status   = document.getElementById('task-status').value;
    const saveBtn  = document.getElementById('task-save');

    // Members can only update status
    if (!isAdmin && isEdit) {
      saveBtn.disabled = true;
      try {
        await api.put(`/tasks/${task.id}`, { status });
        showToast('Status updated!', 'success');
        close();
        loadBoard(_boardProjectId);
      } catch (err) {
        showToast(err.message, 'error');
        saveBtn.disabled = false;
      }
      return;
    }

    // Admin full update
    const title      = document.getElementById('task-title').value.trim();
    const desc       = document.getElementById('task-desc').value.trim();
    const priority   = document.getElementById('task-priority').value;
    const due_date   = document.getElementById('task-due').value || null;
    const assigned_to = document.getElementById('task-assignee').value || null;

    if (!title) {
      const el = document.getElementById('task-title');
      el.classList.add('error');
      el.style.animation = 'shake 0.3s ease';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner spinner-sm" style="border-top-color:#fff"></div>';

    // Backend field names: assigned_to, due_date (not assigneeId/dueDate)
    const payload = { title, description: desc, priority, status, due_date, assigned_to: assigned_to ? Number(assigned_to) : null };

    try {
      if (isEdit) {
        await api.put(`/tasks/${task.id}`, payload);
        showToast('Task updated!', 'success');
      } else {
        await api.post(`/projects/${_boardProjectId}/tasks`, payload);
        showToast('Task created!', 'success');
      }
      close();
      loadBoard(_boardProjectId);
    } catch (err) {
      showToast(err.message, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? 'Save Changes' : 'Create Task';
    }
  });
}
