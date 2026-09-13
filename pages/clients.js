/**
 * EMPADAS DA SARAH – CRM
 * Página de Clientes — mobile-friendly
 */
import { showToast, formatDate, openModal, closeModal } from '../js/app.js';
import { getClients, createClient, updateClient } from '../js/db.js';

var editingId = null, isSubmitting = false, allClientsData = [];

export async function render(container) {
  container.innerHTML = buildLayout();
  await loadClients();
  attachListeners();
}

function buildLayout() {
  return `
  <div class="page-header">
    <div><h1>Clientes</h1></div>
    <div class="page-actions no-print">
      <div class="search-wrap">
        <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="clientSearch" placeholder="Pesquisar cliente..."
          oninput="filterClientTable()"
          style="padding-left:32px;padding-top:8px;padding-bottom:8px;border:1.5px solid var(--border-strong);border-radius:var(--radius-md);font-size:13px;outline:none;width:200px" />
      </div>
      <button class="btn btn-primary" onclick="openClientModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo Cliente
      </button>
    </div>
  </div>
  <div class="page-body">
    <div id="clientTableWrap">
      <div class="page-loading"><div class="spinner dark"></div></div>
    </div>
  </div>

  <!-- Modal -->
  <div class="modal-backdrop" id="clientModal">
    <div class="modal" style="max-width:460px">
      <div class="modal-header">
        <span class="modal-title" id="clientModalTitle">Novo Cliente</span>
        <button class="modal-close" onclick="closeClientModal()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Nome <span style="color:var(--danger)">*</span></label>
          <input type="text" id="clientName" placeholder="Nome completo" />
        </div>
        <div class="field">
          <label>Telefone</label>
          <input type="tel" id="clientPhone" placeholder="(00) 00000-0000" oninput="maskPhone(this)" inputmode="numeric" />
        </div>
        <div class="field">
          <label>Observacao</label>
          <textarea id="clientNotes" placeholder="Observacoes adicionais..."></textarea>
        </div>
        <p id="clientFormError" style="color:var(--danger);font-size:13px;display:none"></p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeClientModal()">Cancelar</button>
        <button class="btn btn-primary" id="saveClientBtn" onclick="saveClient()">Salvar Cliente</button>
      </div>
    </div>
  </div>`;
}

async function loadClients() {
  var wrap = document.getElementById('clientTableWrap');
  try {
    allClientsData = await getClients();
    renderList(allClientsData);
  } catch(err) {
    showToast('Erro ao carregar clientes.', 'error');
    wrap.innerHTML = '<div class="empty-state"><p>Erro ao carregar dados.</p></div>';
  }
}

function renderList(clients) {
  var wrap = document.getElementById('clientTableWrap');
  if (!clients.length) {
    wrap.innerHTML = '<div class="empty-state"><p>Nenhum cliente cadastrado.</p><small>Clique em "Novo Cliente" para cadastrar.</small></div>';
    return;
  }

  // Cards mobile — lista limpa
  wrap.innerHTML = '<div style="display:flex;flex-direction:column;gap:var(--space-3)">' +
    clients.map(function(c) {
      return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-4);box-shadow:var(--shadow-sm)">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-2)">' +
          '<strong style="font-size:15px;color:var(--brand-800)">' + c.name + '</strong>' +
          '<button class="btn-icon" title="Editar" onclick="editClient(\'' + c.id + '\',\'' + esc(c.name) + '\',\'' + esc(c.phone||'') + '\',\'' + esc(c.notes||'') + '\')">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
          '</button>' +
        '</div>' +
        (c.phone ? '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:2px"><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--text-tertiary)">Telefone: </span>' + c.phone + '</div>' : '') +
        (c.notes ? '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:2px"><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--text-tertiary)">Obs: </span>' + c.notes + '</div>' : '') +
        '<div style="font-size:12px;color:var(--text-tertiary);margin-top:var(--space-2)">Cadastrado em: ' + formatDate(c.created_at ? c.created_at.split('T')[0] : '') + '</div>' +
      '</div>';
    }).join('') +
  '</div>';
}

function esc(s) { return String(s).replace(/'/g,"\\'").replace(/"/g,'&quot;'); }

function attachListeners() {
  window.loadClients       = loadClients;
  window.openClientModal   = openClientModal;
  window.closeClientModal  = closeClientModal;
  window.saveClient        = saveClient;
  window.editClient        = editClient;
  window.filterClientTable = filterClientTable;
  window.maskPhone         = maskPhone;
}

function filterClientTable() {
  var term = document.getElementById('clientSearch').value.toLowerCase();
  renderList(allClientsData.filter(function(c) { return c.name.toLowerCase().includes(term); }));
}

function openClientModal(id, name, phone, notes) {
  editingId = id || null;
  document.getElementById('clientModalTitle').textContent = editingId ? 'Editar Cliente' : 'Novo Cliente';
  document.getElementById('clientName').value  = name  || '';
  document.getElementById('clientPhone').value = phone || '';
  document.getElementById('clientNotes').value = notes || '';
  document.getElementById('clientFormError').style.display = 'none';
  openModal('clientModal');
}

function closeClientModal() { closeModal('clientModal'); editingId = null; }

function editClient(id, name, phone, notes) {
  openClientModal(id, name.replace(/\\'/g,"'"), phone.replace(/\\'/g,"'"), notes.replace(/\\'/g,"'"));
}

function maskPhone(input) {
  var v = input.value.replace(/\D/g,'').slice(0,11);
  if (v.length > 6) v = '(' + v.slice(0,2) + ') ' + v.slice(2,7) + '-' + v.slice(7);
  else if (v.length > 2) v = '(' + v.slice(0,2) + ') ' + v.slice(2);
  else if (v.length > 0) v = '(' + v;
  input.value = v;
}

async function saveClient() {
  if (isSubmitting) return;
  var errEl = document.getElementById('clientFormError');
  errEl.style.display = 'none';
  var name  = document.getElementById('clientName').value.trim();
  var phone = document.getElementById('clientPhone').value.trim();
  var notes = document.getElementById('clientNotes').value.trim();
  if (!name) { errEl.textContent='O nome do cliente e obrigatorio.'; errEl.style.display='block'; return; }
  if (!editingId) {
    var dup = allClientsData.find(function(c) { return c.name.toLowerCase() === name.toLowerCase(); });
    if (dup) { if (!confirm('Ja existe um cliente com o nome "' + name + '". Deseja cadastrar mesmo assim?')) return; }
  }
  isSubmitting = true;
  var btn = document.getElementById('saveClientBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Salvando...';
  try {
    var payload = { name: name, phone: phone||null, notes: notes||null };
    if (editingId) { await updateClient(editingId, payload); showToast('Cliente atualizado com sucesso.', 'success'); }
    else { await createClient(payload); showToast('Cliente cadastrado com sucesso.', 'success'); }
    closeClientModal();
    await loadClients();
  } catch(err) {
    errEl.textContent = 'Nao foi possivel salvar o cliente.'; errEl.style.display = 'block';
  } finally {
    isSubmitting = false; btn.disabled = false; btn.innerHTML = 'Salvar Cliente';
  }
}
