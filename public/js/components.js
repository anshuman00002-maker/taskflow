/**
 * components.js — Full UI component library
 * Provides: Toast, Modal, Spinner, Avatar, Ripple, Badge helpers, Skeleton
 */

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const root = document.getElementById('toast-root');
  const el   = document.createElement('div');
  el.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  el.innerHTML = `<span class="toast-icon">${icons[type] || ''}</span><span>${message}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('exit');
    setTimeout(() => el.remove(), 320);
  }, duration);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
// Accepts either { body, footer } or { bodyHTML, footerHTML } for flexibility
function openModal({ title = '', body, footer, bodyHTML, footerHTML, onClose } = {}) {
  const root    = document.getElementById('modal-root');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.innerHTML = `
    <div class="modal-header">
      <span class="modal-title">${title}</span>
      <button class="modal-close" id="modal-close-btn" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">${bodyHTML || body || ''}</div>
    ${(footerHTML || footer) ? `<div class="modal-footer">${footerHTML || footer}</div>` : ''}
  `;

  overlay.appendChild(content);
  root.appendChild(overlay);
  attachRipples(content);

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onEscKey);
    if (onClose) onClose();
  };

  const onEscKey = (e) => { if (e.key === 'Escape') close(); };
  content.querySelector('#modal-close-btn').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onEscKey);

  return { overlay, content, close };
}

// Legacy close (for old call sites)
function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

// Confirm dialog
function confirmDialog(message) {
  return new Promise(resolve => {
    const { content, close } = openModal({
      title: 'Confirm',
      bodyHTML: `<p style="color:var(--text-secondary);font-size:14px">${message}</p>`,
      footerHTML: `
        <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
        <button class="btn btn-danger"    id="confirm-ok">Confirm</button>
      `,
    });
    content.querySelector('#confirm-cancel').addEventListener('click', () => { close(); resolve(false); });
    content.querySelector('#confirm-ok').addEventListener('click',    () => { close(); resolve(true);  });
  });
}

// ── Ripple ────────────────────────────────────────────────────────────────────
function addRipple(btn) {
  btn.addEventListener('click', e => {
    const r    = document.createElement('span');
    r.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    r.style.left = (e.clientX - rect.left) + 'px';
    r.style.top  = (e.clientY - rect.top)  + 'px';
    btn.appendChild(r);
    setTimeout(() => r.remove(), 600);
  });
}

function attachRipples(container = document) {
  (container.querySelectorAll ? container : document).querySelectorAll('.btn').forEach(addRipple);
}

// Legacy alias
function applyRipples(container) { attachRipples(container); }

// ── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#6c63ff','#00d4aa','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6'];

function getAvatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// Returns a DOM element
function createAvatar(name = '?', sizeClass = '') {
  const initials = name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase()).join('') || '?';
  const el = document.createElement('div');
  el.className = `avatar ${sizeClass}`.trim();
  el.style.background = getAvatarColor(name);
  el.textContent = initials;
  el.title = name;
  return el;
}

// Returns a DOM element stack
function createAvatarStack(names = [], max = 4) {
  const wrap = document.createElement('div');
  wrap.className = 'avatar-stack';
  names.slice(0, max).forEach(n => wrap.appendChild(createAvatar(n, 'avatar-sm')));
  if (names.length > max) {
    const more = document.createElement('div');
    more.className = 'avatar avatar-sm';
    more.style.cssText = 'background:var(--bg-glass);border:2px solid var(--border);color:var(--text-secondary)';
    more.textContent = `+${names.length - max}`;
    wrap.appendChild(more);
  }
  return wrap;
}

// Legacy: returns HTML string
function makeAvatar(name, size = 34) {
  const initials = (name || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
  const bg = getAvatarColor(name);
  return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.floor(size*0.38)}px;background:${bg}">${initials}</div>`;
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function createSpinner(sizeClass = '') {
  const el = document.createElement('div');
  el.className = `spinner ${sizeClass}`.trim();
  return el;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function skeletonRows(n = 3, height = 60) {
  return Array(n).fill('').map(() =>
    `<div class="skeleton" style="height:${height}px;margin-bottom:12px"></div>`
  ).join('');
}

// ── Counter Animation ─────────────────────────────────────────────────────────
function animateCounter(el, target) {
  let v = 0;
  const step = () => {
    v += Math.ceil((target - v) / 8);
    el.textContent = v;
    if (v < target) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

// ── Badge Helpers ─────────────────────────────────────────────────────────────
function statusBadge(s) {
  const map = {
    todo:        ['badge-todo',     'To Do'],
    in_progress: ['badge-progress', 'In Progress'],
    'in-progress':['badge-progress','In Progress'],
    done:        ['badge-done',     'Done'],
    overdue:     ['badge-overdue',  'Overdue'],
  };
  const [cls, label] = map[s] || ['badge-todo', s];
  return `<span class="badge ${cls}">${label}</span>`;
}

function priorityDot(p) {
  const cls = { high:'priority-high', medium:'priority-medium', low:'priority-low' }[p] || 'priority-low';
  return `<span class="priority-dot ${cls}" title="${p || 'low'}"></span>`;
}

function roleBadge(role) {
  return `<span class="badge ${role === 'admin' ? 'badge-admin' : 'badge-member'}">${role || 'member'}</span>`;
}

function priorityBadge(p) {
  return `<span class="badge badge-${p}">${p}</span>`;
}

// ── Format Helpers ────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'done') return false;
  return new Date(dueDate) < new Date();
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
