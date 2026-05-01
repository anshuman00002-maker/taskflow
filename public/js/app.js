/**
 * app.js — Client-side router, global state, sidebar
 */

// ── State ─────────────────────────────────────────────────────────────────────
const AppState = {
  user:          null,
  currentView:   null,
  activeProject: null,
};

function getUser() {
  if (AppState.user) return AppState.user;
  try { AppState.user = JSON.parse(localStorage.getItem('tf_user')); } catch(e){}
  return AppState.user;
}

function setAuth(token, user) {
  localStorage.setItem('tf_token', token);
  localStorage.setItem('tf_user',  JSON.stringify(user));
  AppState.user = user;
}

function clearAuth() {
  localStorage.removeItem('tf_token');
  localStorage.removeItem('tf_user');
  AppState.user = null;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function renderSidebar(currentPath) {
  const user    = getUser();
  const sidebar = document.getElementById('sidebar');
  const mainEl  = document.querySelector('.app-main');

  if (!user) {
    sidebar.classList.add('hidden');
    if (mainEl) mainEl.style.marginLeft = '0';
    return;
  }

  sidebar.classList.remove('hidden');
  if (mainEl) mainEl.style.marginLeft = '240px';

  const path    = currentPath || location.pathname;
  const isBoard = /^\/projects\/.+/.test(path);

  const avatarBg = getAvatarColor(user.name);
  const initials = user.name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase()).join('');

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-icon">⚡</div>
      <span class="logo-text">TaskFlow</span>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-item ${path==='/dashboard'?'active':''}" id="nav-dashboard">
        <span class="nav-icon">📊</span><span class="nav-label">Dashboard</span>
      </div>
      <div class="nav-item ${path==='/projects'?'active':''}" id="nav-projects">
        <span class="nav-icon">📁</span><span class="nav-label">Projects</span>
      </div>
      ${AppState.activeProject && isBoard ? `
      <div class="nav-item active" style="padding-left:28px;font-size:13px">
        <span class="nav-icon">🗂️</span>
        <span class="nav-label">${AppState.activeProject.name}</span>
      </div>` : ''}
    </nav>
    <div class="sidebar-footer">
      <div class="user-info" id="btn-logout" title="Click to logout" style="cursor:pointer">
        <div class="avatar" style="background:${avatarBg}">${initials}</div>
        <div class="user-details">
          <div class="user-name">${user.name}</div>
          <div class="user-email">${user.email}</div>
        </div>
      </div>
    </div>
  `;

  sidebar.querySelector('#nav-dashboard').onclick = () => navigate('/dashboard');
  sidebar.querySelector('#nav-projects').onclick  = () => navigate('/projects');
  sidebar.querySelector('#btn-logout').onclick    = async () => {
    const ok = await confirmDialog('Are you sure you want to logout?');
    if (ok) { clearAuth(); navigate('/login'); }
  };
}

// ── Router ────────────────────────────────────────────────────────────────────
function navigate(path) {
  window.history.pushState({}, '', path);
  route(path);
}
window.navigate = navigate;

function route(path) {
  const user = getUser();

  if (!user && path !== '/login') { renderAuth(); return; }
  if (user  && path === '/login') { navigate('/dashboard'); return; }

  if (path === '/login') {
    renderSidebar(path);
    renderAuth();
    return;
  }

  renderSidebar(path);

  if (path === '/dashboard') {
    AppState.currentView = 'dashboard';
    renderDashboard();
    return;
  }
  if (path === '/projects') {
    AppState.currentView = 'projects';
    renderProjects();
    return;
  }
  const boardMatch = path.match(/^\/projects\/(.+)$/);
  if (boardMatch) {
    AppState.currentView = 'board';
    renderBoard(boardMatch[1]);
    return;
  }

  navigate('/dashboard');
}

window.addEventListener('popstate', () => route(location.pathname));

// ── Boot ──────────────────────────────────────────────────────────────────────
route(location.pathname || '/dashboard');
