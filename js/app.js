/* === Config === */
const SUPABASE_URL = 'https://gfcncubcurtnzupycwnf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Okvi7ubVn0xCZ89cS2Qedg_Xzf8AZwF';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const COMMISSION   = 0.15;
/* === State === */
let currentUser = null;
let isAdmin     = false;
let userCountry = 'ID';
let userLang    = 'zh-TW';

/* === i18n === */
const I18N = {
  strings: {},
  async init(lang) {
    userLang = lang || localStorage.getItem('portal_lang') || 'zh-TW';
    try {
      const res = await fetch('./locales/' + userLang + '.json');
      if (res.ok) this.strings = await res.json();
      else throw new Error();
    } catch {
      try {
        const res = await fetch('./locales/zh-TW.json');
        if (res.ok) this.strings = await res.json();
      } catch {}
    }
    localStorage.setItem('portal_lang', userLang);
    this.apply();
  },
  t(key) {
    const keys = key.split('.');
    let val = this.strings;
    for (const k of keys) { if (val && typeof val === 'object') val = val[k]; }
    return (val != null) ? val : key;
  },
  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const txt = this.t(key);
      if (txt !== key) el.textContent = txt;
    });
  }
};

/* === Currency === */
function fmt(amount) {
  if (userCountry === 'TW') return 'NT$' + Number(amount).toLocaleString();
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

/* === Utils === */
function escHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) { return escHtml(s); }

/* === Password Toggle === */
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const btn = document.querySelector(`.toggle-password[data-target="${inputId}"]`);
  if (!input || !btn) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.querySelector('.eye-icon').textContent = isPassword ? '🙈' : '👁';
}

/* === Password Strength === */
function updatePasswordStrength(password) {
  const fill = document.getElementById('strength-fill');
  const text = document.getElementById('strength-text');
  if (!fill || !text) return;

  fill.className = 'strength-fill';

  if (!password) {
    text.textContent = I18N.t('auth.password_strength');
    return;
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) {
    fill.classList.add('weak');
    text.textContent = I18N.t('auth.password_weak') || 'Weak';
  } else if (score <= 4) {
    fill.classList.add('medium');
    text.textContent = I18N.t('auth.password_medium') || 'Medium';
  } else {
    fill.classList.add('strong');
    text.textContent = I18N.t('auth.password_strong') || 'Strong';
  }
}

/* === Contract === */
let pendingRegisterData = null;

function mkEl(tag, cls) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}

function showContractOverlay() {
  document.getElementById('contract-overlay').classList.remove('hidden');
  renderContractBody();
  document.getElementById('contract-agree').checked = false;
  document.getElementById('btn-contract-confirm').disabled = true;
}

function hideContractOverlay() {
  document.getElementById('contract-overlay').classList.add('hidden');
  pendingRegisterData = null;
}

function t(key) { return I18N.t(key); }

function renderContractBody() {
  const container = document.getElementById('contract-body');
  container.innerHTML = '';
  const s = I18N.strings;

  function section(titleKey) {
    const h = mkEl('h4');
    h.textContent = t(titleKey);
    container.appendChild(h);
  }

  function para(enKey, localKey) {
    const p = mkEl('p');
    const strong = mkEl('strong');
    strong.textContent = t(enKey);
    p.appendChild(strong);
    p.appendChild(document.createElement('br'));
    p.appendChild(document.createTextNode(t(localKey)));
    container.appendChild(p);
  }

  function divider(key) {
    const div = mkEl('div', 'section-title');
    div.textContent = t(key);
    container.appendChild(div);
  }

  function note(text) {
    const p = mkEl('p');
    p.style.cssText = 'margin-top:16px;color:var(--text-muted);font-size:0.8rem';
    p.textContent = text;
    container.appendChild(p);
  }

  section('terms.company');
  section('terms.agent');

  divider('terms.section1');
  para('terms.rate_en', 'terms.rate');
  para('terms.clawback_en', 'terms.clawback');
  para('terms.minimum_en', 'terms.minimum');
  para('terms.timeline_en', 'terms.timeline');

  divider('terms.section2');
  para('terms.no_employment_en', 'terms.no_employment');
  para('terms.no_authority_en', 'terms.no_authority');

  divider('terms.section3');
  para('terms.no_spam_en', 'terms.no_spam');
  para('terms.non_solicitation_en', 'terms.non_solicitation');

  divider('terms.section4');
  para('terms.confidentiality_en', 'terms.confidentiality');

  divider('terms.section5');
  para('terms.liability_en', 'terms.liability');

  divider('terms.section6');
  para('terms.termination_convenience_en', 'terms.termination_convenience');
  para('terms.termination_cause_en', 'terms.termination_cause');

  divider('terms.section7');
  para('terms.jurisdiction_en', 'terms.jurisdiction');

  divider('terms.section8');
  para('terms.electronic_en', 'terms.electronic');
  para('terms.age_en', 'terms.age');
  para('terms.read_en', 'terms.read');
  para('terms.signature_en', 'terms.signature');

  note(t('terms.contact'));
}

/* === DOM Ready === */
document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lang = btn.dataset.lang;
      await I18N.init(lang);
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    });
  });

  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
  });

  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => togglePassword(btn.dataset.target));
  });

  const regPassword = document.getElementById('reg-password');
  if (regPassword) {
    regPassword.addEventListener('input', () => updatePasswordStrength(regPassword.value));
  }

  document.getElementById('form-login').addEventListener('submit', handleLogin);
  document.getElementById('form-register').addEventListener('submit', handleRegister);
  document.getElementById('form-forgot').addEventListener('submit', handleForgotPassword);
  document.getElementById('btn-forgot').addEventListener('click', () => showAuthForm('forgot'));
  document.getElementById('btn-back-login-forgot').addEventListener('click', () => showAuthForm('login'));
  document.getElementById('btn-logout').addEventListener('click', handleLogout);

  document.getElementById('btn-open-add-client').addEventListener('click', openModal);
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('add-client-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('form-add-client').addEventListener('submit', handleAddClient);
  document.getElementById('client-plan').addEventListener('change', e => {
    const fees = { 'Option A Basic': 3000000, 'Option A Professional': 4500000, 'Option A Premium': 5000000 };
    const fee = fees[e.target.value] != null ? fees[e.target.value] : '';
    document.getElementById('client-fee').value = fee;
  });

  // Contract overlay
  document.getElementById('contract-agree').addEventListener('change', e => {
    document.getElementById('btn-contract-confirm').disabled = !e.target.checked;
  });
  document.getElementById('btn-contract-disagree').addEventListener('click', hideContractOverlay);
  document.getElementById('btn-close-contract').addEventListener('click', hideContractOverlay);
  document.getElementById('contract-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) hideContractOverlay();
  });
  document.getElementById('btn-contract-confirm').addEventListener('click', confirmRegister);

  sb.auth.onAuthStateChange(async (_event, session) => {
    if (session && session.user) {
      currentUser = session.user;
      await resolveAdmin();
      await I18N.init(userLang);
      showScreen('dashboard');
      loadDashboard();
    } else {
      currentUser = null;
      isAdmin = false;
      showScreen('auth');
    }
  });

  await I18N.init('zh-TW');
});

async function resolveAdmin() {
  const { data } = await sb.from('agents').select('is_admin, full_name, country, lang').eq('id', currentUser.id).single();
  isAdmin = !!(data && data.is_admin);
  if (data) {
    userCountry = data.country || 'ID';
    userLang = data.lang || 'zh-TW';
  }
  const name = (data && data.full_name) || currentUser.email;
  document.getElementById('header-welcome').textContent = I18N.t('welcome') + ', ' + name;
  document.getElementById('header-user').classList.remove('hidden');
  document.getElementById('col-approve').classList.toggle('hidden', !isAdmin);
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-login');
  const btnText = btn.querySelector('.btn-text');
  const btnLoader = btn.querySelector('.btn-loader');

  btn.disabled = true;
  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');
  showMsg('login-error', '');

  const { error } = await sb.auth.signInWithPassword({
    email: document.getElementById('login-email').value.trim(),
    password: document.getElementById('login-password').value
  });

  if (error) showMsg('login-error', I18N.t('errors.login_failed'));

  btn.disabled = false;
  btnText.classList.remove('hidden');
  btnLoader.classList.add('hidden');
}

async function handleRegister(e) {
  e.preventDefault();
  showMsg('reg-error', '');
  showMsg('reg-success', '');

  const codename = document.getElementById('reg-codename').value.trim();
  const name    = document.getElementById('reg-name').value.trim();
  const email   = document.getElementById('reg-email').value.trim();
  const phone   = document.getElementById('reg-phone').value.trim();
  const pass    = document.getElementById('reg-password').value;

  if (!codename || !name || !email || !phone || !pass) {
    showMsg('reg-error', I18N.t('errors.fill_all_fields') || 'Please fill in all fields before registering');
    return;
  }

  if (pass.length < 8) {
    showMsg('reg-error', I18N.t('errors.password_min_length') || 'Password must be at least 8 characters');
    return;
  }

  pendingRegisterData = { codename, name, email, phone, pass };
  showContractOverlay();
}

async function confirmRegister() {
  if (!pendingRegisterData) return;

  const btn = document.getElementById('btn-contract-confirm');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = I18N.t('auth.registering') || 'Registering...';

  const { error } = await sb.auth.signUp({
    email: pendingRegisterData.email,
    password: pendingRegisterData.pass,
    options: {
      data: {
        full_name: pendingRegisterData.name,
        codename: pendingRegisterData.codename,
        phone: pendingRegisterData.phone,
        country: userCountry,
        lang: userLang
      }
    }
  });

  if (error) {
    showMsg('reg-error', I18N.t('errors.register_failed'));
  } else {
    showMsg('reg-success', I18N.t('register_success'), true);
    document.getElementById('form-register').reset();
    hideContractOverlay();
    setTimeout(() => switchAuthTab('login'), 2000);
  }

  btn.disabled = false;
  btn.textContent = originalText;
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-forgot-submit');
  const btnText = btn.querySelector('.btn-text');
  const btnLoader = btn.querySelector('.btn-loader');

  btn.disabled = true;
  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');
  showMsg('forgot-error', '');
  showMsg('forgot-success', '');

  const email = document.getElementById('forgot-email').value.trim();
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/' });

  if (error) showMsg('forgot-error', I18N.t('errors.forgot_failed'));
  else showMsg('forgot-success', I18N.t('reset_sent'), true);

  btn.disabled = false;
  btnText.classList.remove('hidden');
  btnLoader.classList.add('hidden');
}

async function handleLogout() {
  await sb.auth.signOut();
  document.getElementById('header-user').classList.add('hidden');
}

async function loadDashboard() {
  await Promise.all([loadClients(), loadInvoices()]);
}

async function loadClients() {
  const tbody = document.getElementById('clients-tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Loading...</td></tr>';
  const query = isAdmin
    ? sb.from('clients').select('*, agents(full_name)').eq('country', userCountry).order('created_at', { ascending: false })
    : sb.from('clients').select('*').eq('agent_id', currentUser.id).eq('country', userCountry).order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) { tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Error loading clients.</td></tr>'; return; }
  renderClients(data || []);
  renderStats(data || []);
  await loadTotalEarned();
}

function renderClients(clients) {
  const tbody = document.getElementById('clients-tbody');
  if (!clients.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">' + I18N.t('dashboard.no_clients') + '</td></tr>';
    document.getElementById('total-commission').textContent = fmt(0);
    return;
  }
  let totalComm = 0;
  const rows = clients.map(c => {
    const fee = Number(c.monthly_fee) || 0;
    const comm = fee * COMMISSION;
    if (c.status === 'active') totalComm += comm;
    const badge = c.status === 'active'
      ? '<span class="status-badge status-active">' + escHtml(I18N.t('status.active')) + '</span>'
      : '<span class="status-badge status-hold">' + escHtml(I18N.t('status.hold')) + '</span>';
    const agentInfo = (isAdmin && c.agents)
      ? '<span style="font-size:0.8rem;color:var(--text-muted)">' + escHtml(c.agents.full_name) + '</span><br>' : '';
    const approveBtn = (isAdmin && c.status !== 'active')
      ? '<button type="button" class="btn-approve" data-id="' + escAttr(c.id) + '">' + escHtml(I18N.t('dashboard.approve')) + '</button>' : '';
    const startDate = c.start_date ? new Date(c.start_date).toLocaleDateString() : '—';
    return '<tr><td>' + agentInfo + escHtml(c.client_name) + '</td><td>' + escHtml(c.plan) + '</td><td>' + fmt(fee) + '</td><td>' + fmt(comm) + '</td><td>' + badge + '</td><td>' + startDate + '</td><td>' + approveBtn + '</td></tr>';
  });
  tbody.innerHTML = rows.join('');
  document.getElementById('total-commission').textContent = fmt(totalComm);
  tbody.querySelectorAll('.btn-approve').forEach(btn => btn.addEventListener('click', () => approveClient(btn.dataset.id)));
}

function renderStats(clients) {
  const active = clients.filter(c => c.status === 'active');
  const monthly = active.reduce((s, c) => s + Number(c.monthly_fee) * COMMISSION, 0);
  document.getElementById('stat-clients').textContent = clients.length;
  document.getElementById('stat-monthly').textContent = fmt(monthly);
  document.getElementById('stat-yearly').textContent  = fmt(monthly * 12);
}

async function loadTotalEarned() {
  let query = sb.from('invoices').select('commission_amount').eq('status', 'paid').eq('country', userCountry);
  if (!isAdmin) query = query.eq('agent_id', currentUser.id);
  const { data } = await query;
  const total = (data || []).reduce((s, r) => s + Number(r.commission_amount), 0);
  document.getElementById('stat-earned').textContent = fmt(total);
}

async function approveClient(id) {
  const { error } = await sb.from('clients').update({ status: 'active' }).eq('id', id);
  if (error) { showToast(I18N.t('toast.error')); return; }
  showToast(I18N.t('toast.client_approved'));
  loadClients();
}

async function loadInvoices() {
  const tbody = document.getElementById('invoices-tbody');
  tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Loading...</td></tr>';
  let query = sb.from('invoices').select('*, clients(client_name)').eq('status', 'pending').eq('country', userCountry).order('due_date');
  if (!isAdmin) query = query.eq('agent_id', currentUser.id);
  const { data, error } = await query;
  if (error) { tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Error loading invoices.</td></tr>'; return; }
  renderInvoices(data || []);
}

function renderInvoices(invoices) {
  const tbody = document.getElementById('invoices-tbody');
  if (!invoices.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">' + I18N.t('dashboard.no_invoices') + '</td></tr>';
    return;
  }
  const rows = invoices.map(inv => {
    const amount = Number(inv.commission_amount) || 0;
    const due   = inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—';
    const client = (inv.clients && inv.clients.client_name) || '—';
    const payBtn = isAdmin
      ? '<button type="button" class="btn-pay" data-id="' + escAttr(inv.id) + '">' + escHtml(I18N.t('dashboard.mark_paid')) + '</button>'
      : '<span style="color:var(--text-muted);font-size:0.85rem">Pending</span>';
    return '<tr><td>' + escHtml(client) + '</td><td>' + fmt(amount) + '</td><td>' + due + '</td><td>' + payBtn + '</td></tr>';
  });
  tbody.innerHTML = rows.join('');
  tbody.querySelectorAll('.btn-pay').forEach(btn => btn.addEventListener('click', () => markInvoicePaid(btn.dataset.id)));
}

async function markInvoicePaid(id) {
  const { error } = await sb.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
  if (error) { showToast(I18N.t('toast.error')); return; }
  showToast(I18N.t('toast.invoice_paid'));
  loadInvoices();
  loadTotalEarned();
}

async function handleAddClient(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-client');
  btn.disabled = true;
  showMsg('add-client-error', '');
  const { error } = await sb.from('clients').insert({
    agent_id: currentUser.id,
    country: userCountry,
    client_name: document.getElementById('client-name').value.trim(),
    plan: document.getElementById('client-plan').value,
    monthly_fee: Number(document.getElementById('client-fee').value),
    start_date: document.getElementById('client-start').value || null,
    status: 'hold',
  });
  if (error) showMsg('add-client-error', error.message);
  else {
    closeModal();
    e.target.reset();
    showToast(I18N.t('toast.client_added'));
    loadClients();
  }
  btn.disabled = false;
}

function showScreen(name) {
  document.getElementById('auth-screen').classList.toggle('hidden', name !== 'auth');
  document.getElementById('dashboard-screen').classList.toggle('hidden', name !== 'dashboard');
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  showAuthForm(tab);
}

function showAuthForm(name) {
  ['login', 'register', 'forgot'].forEach(f => {
    document.getElementById('form-' + f).classList.toggle('hidden', f !== name);
  });
  if (name === 'login' || name === 'register') switchAuthTab(name);
  if (name === 'forgot') {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
  }
}

function openModal()  { document.getElementById('add-client-overlay').classList.remove('hidden'); }
function closeModal() { document.getElementById('add-client-overlay').classList.add('hidden'); }

function showMsg(id, msg, success) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('hidden', !msg);
  el.classList.toggle('success', !!success);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3000);
}
