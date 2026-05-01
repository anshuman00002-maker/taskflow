/**
 * auth.js — Login & Signup view
 * Uses existing CSS classes: .auth-page, .auth-bg, .auth-card, .auth-tabs, .auth-tab
 */
function renderAuth() {
  const sidebar = document.getElementById('sidebar');
  const mainEl  = document.querySelector('.app-main');
  if (sidebar) sidebar.classList.add('hidden');
  if (mainEl)  mainEl.style.marginLeft = '0';

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-page view-enter">
      <div class="auth-bg"></div>
      <div class="auth-card">
        <div class="auth-logo">
          <div class="auth-logo-icon">⚡</div>
          <span class="auth-logo-text">TaskFlow</span>
        </div>

        <div class="auth-tabs" id="auth-tabs">
          <div class="auth-tab-indicator" id="tab-indicator" style="width:50%;left:0"></div>
          <div class="auth-tab active" id="tab-login"  data-tab="login">Login</div>
          <div class="auth-tab"        id="tab-signup" data-tab="signup">Sign Up</div>
        </div>

        <div id="auth-form-wrap"></div>
      </div>
    </div>
  `;

  function renderLoginForm() {
    document.getElementById('auth-form-wrap').innerHTML = `
      <form class="auth-form" id="auth-form" novalidate>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" id="auth-email" placeholder="you@example.com" required autocomplete="email">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input class="form-input" type="password" id="auth-password" placeholder="••••••••" required autocomplete="current-password">
        </div>
        <div id="auth-error" style="color:var(--danger);font-size:13px;display:none;margin-top:-8px"></div>
        <button class="btn btn-primary auth-submit" type="submit" id="auth-btn">Login</button>
      </form>`;
    wireForm('login');
  }

  function renderSignupForm() {
    document.getElementById('auth-form-wrap').innerHTML = `
      <form class="auth-form" id="auth-form" novalidate>
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input class="form-input" type="text" id="auth-name" placeholder="Jane Doe" required autocomplete="name">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" id="auth-email" placeholder="you@example.com" required autocomplete="email">
        </div>
        <div class="form-group">
          <label class="form-label">Password <span style="color:var(--text-muted);font-size:11px">(min 6 chars)</span></label>
          <input class="form-input" type="password" id="auth-password" placeholder="••••••••" required autocomplete="new-password">
        </div>
        <div id="auth-error" style="color:var(--danger);font-size:13px;display:none;margin-top:-8px"></div>
        <button class="btn btn-primary auth-submit" type="submit" id="auth-btn">Create Account</button>
      </form>`;
    wireForm('signup');
  }

  function shake(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('error');
    setTimeout(() => el.classList.remove('error'), 500);
  }

  function wireForm(type) {
    addRipple(document.getElementById('auth-btn'));
    document.getElementById('auth-form').addEventListener('submit', async e => {
      e.preventDefault();
      const btn   = document.getElementById('auth-btn');
      const errEl = document.getElementById('auth-error');
      const email = document.getElementById('auth-email')?.value.trim();
      const pass  = document.getElementById('auth-password')?.value;

      errEl.style.display = 'none';
      if (!email) { shake('auth-email'); return; }
      if (!pass)  { shake('auth-password'); return; }

      const label  = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Please wait…';

      try {
        let data;
        if (type === 'login') {
          data = await Auth.login({ email, password: pass });
        } else {
          const name = document.getElementById('auth-name')?.value.trim();
          if (!name) { shake('auth-name'); btn.disabled = false; btn.textContent = label; return; }
          data = await Auth.signup({ name, email, password: pass });
        }
        setAuth(data.token, data.user);
        showToast(`Welcome, ${data.user.name}! 🎉`, 'success');
        navigate('/dashboard');
      } catch (err) {
        errEl.textContent   = err.message || 'Something went wrong';
        errEl.style.display = 'block';
        shake('auth-password');
        btn.disabled    = false;
        btn.textContent = label;
      }
    });
  }

  function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById('tab-indicator').style.left = tab === 'login' ? '0' : '50%';
    tab === 'login' ? renderLoginForm() : renderSignupForm();
  }

  document.querySelectorAll('.auth-tab').forEach(t => {
    t.onclick = () => switchTab(t.dataset.tab);
  });

  renderLoginForm();
}
