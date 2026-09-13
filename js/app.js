/**
 * EMPADAS DA SARAH – CRM
 * js/app.js — Bootstrap, roteamento, auth guard, sidebar
 */

const { createClient } = window.supabase;

const SUPABASE_URL      = window.__APP_CONFIG__?.SUPABASE_URL      || '';
const SUPABASE_ANON_KEY = window.__APP_CONFIG__?.SUPABASE_ANON_KEY || '';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
});

export let currentUser    = null;
export let currentProfile = null;

// ── Bootstrap ──────────────────────────────────────────────────
async function bootstrap() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    console.log('SESSION:', session);

    if (!session) {
      window.location.href = 'index.html';
      return;
    }

    const { data: profile, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    console.log('PROFILE:', profile, 'ERROR:', error);

    if (error || !profile || !profile.active) {
      await sb.auth.signOut();
      window.location.href = 'index.html';
      return;
    }

    currentUser    = session.user;
    currentProfile = profile;
    renderSidebar();
    navigateTo('dashboard');

  } catch (err) {
    console.error('Erro no bootstrap:', err);
    document.getElementById('mainContent').innerHTML =
      '<div style="padding:40px;color:red"><h2>ERRO:</h2><pre>' + err.message + '</pre></div>';
  }
}

window.handleSignOut = async function () {
  await sb.auth.signOut();
  window.location.href = 'index.html';
};

window.openMobileSidebar = function () {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('sidebarOverlay').classList.add('visible');
};
window.closeMobileSidebar = function () {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebarOverlay').classList.remove('visible');
};

// ── Sidebar ────────────────────────────────────────────────────
function renderSidebar() {
  document.getElementById('sidebarUserName').textContent = currentProfile.name;
  document.getElementById('sidebarUserRole').textContent =
    currentProfile.role === 'admin' ? 'Administrador' : 'Vendedor';

  const nav     = document.getElementById('sidebarNav');
  const isAdmin = currentProfile.role === 'admin';

  const sellerItems = [
    { id: 'dashboard', label: 'Dashboard',        icon: iconGrid() },
    { id: 'sales',     label: 'Registrar Vendas', icon: iconCart() },
    { id: 'clients',   label: 'Clientes',          icon: iconUsers() },
    { id: 'flavors',   label: 'Sabores',           icon: iconTag() },
  ];

  const adminItems = [
    { id: 'dashboard',    label: 'Dashboard',     icon: iconGrid() },
    { id: 'conciliation', label: 'Conciliacao',   icon: iconCheck() },
    { id: 'reports',      label: 'Relatorios',    icon: iconChart() },
    { id: 'expenses',     label: 'Despesas',      icon: iconWallet() },
    { id: 'clients',      label: 'Clientes',      icon: iconUsers() },
    { id: 'sellers',      label: 'Vendedores',    icon: iconPeople() },
    { id: 'flavors',      label: 'Sabores',       icon: iconTag() },
    { id: 'settings',     label: 'Configuracoes', icon: iconSettings() },
  ];

  const items = isAdmin ? adminItems : sellerItems;
  nav.innerHTML = items.map(item => `
    <button class="nav-item" id="nav-${item.id}" onclick="navigateTo('${item.id}')">
      ${item.icon}<span>${item.label}</span>
    </button>`).join('');
}

// ── Roteador ───────────────────────────────────────────────────
window.navigateTo = async function (page) {
  closeMobileSidebar();
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navItem = document.getElementById('nav-' + page);
  if (navItem) navItem.classList.add('active');

  const isAdmin = currentProfile.role === 'admin';
  const adminOnly = ['conciliation', 'reports', 'expenses', 'sellers', 'settings'];
  if (!isAdmin && adminOnly.includes(page)) {
    showToast('Acesso negado.', 'error');
    navigateTo('dashboard');
    return;
  }

  const main = document.getElementById('mainContent');
  main.innerHTML = '<div class="page-loading"><div class="spinner dark"></div></div>';

  try {
    switch (page) {
      case 'dashboard':
        if (isAdmin) {
          const m = await import('../pages/dashboard-admin.js');
          m.render(main);
        } else {
          const m = await import('../pages/dashboard-seller.js');
          m.render(main);
        }
        break;
      case 'sales':
        { const m = await import('../pages/sales.js'); m.render(main); break; }
      case 'clients':
        { const m = await import('../pages/clients.js'); m.render(main); break; }
      case 'flavors':
        { const m = await import('../pages/flavors.js'); m.render(main); break; }
      case 'conciliation':
        { const m = await import('../pages/conciliation.js'); m.render(main); break; }
      case 'reports':
        { const m = await import('../pages/reports.js'); m.render(main); break; }
      case 'expenses':
        { const m = await import('../pages/expenses.js'); m.render(main); break; }
      case 'sellers':
        { const m = await import('../pages/sellers.js'); m.render(main); break; }
      case 'settings':
        { const m = await import('../pages/settings.js'); m.render(main); break; }
      default:
        main.innerHTML = '<div class="page-body"><div class="empty-state"><p>Pagina nao encontrada.</p></div></div>';
    }
  } catch (err) {
    console.error('Erro ao carregar pagina:', err);
    main.innerHTML = '<div class="page-body"><div class="empty-state"><p>Erro ao carregar a pagina.</p><small>' + err.message + '</small></div></div>';
  }
};

// ── Toast ──────────────────────────────────────────────────────
export function showToast(message, type, duration) {
  type     = type     || 'info';
  duration = duration || 4000;
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  const icon = type === 'success'
    ? '<polyline points="20 6 9 17 4 12"/>'
    : type === 'error'
      ? '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
      : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>';
  toast.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' + icon + '</svg><span>' + message + '</span>';
  container.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'opacity .2s, transform .2s';
    setTimeout(function() { toast.remove(); }, 200);
  }, duration);
}

// ── Helpers ────────────────────────────────────────────────────
export function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}
export function todayISO() {
  return new Date().toISOString().split('T')[0];
}
export function openModal(id)  {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}
export function confirmDialog(message) {
  return new Promise(function(resolve) {
    const existing = document.getElementById('globalConfirm');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'globalConfirm';
    el.className = 'modal-backdrop confirm-modal';
    el.innerHTML = '<div class="modal" style="max-width:380px"><div class="modal-header"><span class="modal-title">Confirmacao</span></div><div class="modal-body"><p style="font-size:14px;color:var(--text-secondary)">' + message + '</p></div><div class="modal-footer"><button class="btn btn-secondary" id="confirmNo">Cancelar</button><button class="btn btn-danger" id="confirmYes">Confirmar</button></div></div>';
    document.body.appendChild(el);
    requestAnimationFrame(function() { el.classList.add('open'); });
    el.querySelector('#confirmYes').onclick = function() { el.remove(); resolve(true); };
    el.querySelector('#confirmNo').onclick  = function() { el.remove(); resolve(false); };
  });
}

// ── Icons ──────────────────────────────────────────────────────
function iconGrid()     { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'; }
function iconCart()     { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>'; }
function iconUsers()    { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'; }
function iconTag()      { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>'; }
function iconCheck()    { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'; }
function iconChart()    { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'; }
function iconWallet()   { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>'; }
function iconPeople()   { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'; }
function iconSettings() { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'; }

bootstrap();
