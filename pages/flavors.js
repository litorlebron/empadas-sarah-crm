/**
 * EMPADAS DA SARAH – CRM
 * Página de Sabores — mobile-friendly
 */
import { showToast, formatDate, openModal, closeModal } from '../js/app.js';
import { getFlavors, createFlavor, updateFlavor } from '../js/db.js';

var editingId = null, isSubmitting = false, allFlavorsData = [];

export async function render(container) {
  container.innerHTML = buildLayout();
  await loadFlavors();
  attachListeners();
}

function buildLayout() {
  return `
  <div class="page-header">
    <div><h1>Sabores</h1></div>
    <div class="page-actions no-print">
      <div class="search-wrap">
        <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="flavorSearch" placeholder="Pesquisar sabor..."
          oninput="filterFlavorTable()"
          style="padding-left:32px;padding-top:8px;padding-bottom:8px;border:1.5px solid var(--border-strong);border-radius:var(--radius-md);font-size:13px;outline:none;width:190px" />
      </div>
      <button class="btn btn-primary" onclick="openFlavorModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo Sabor
      </button>
    </div>
  </div>
  <div class="page-body">
    <div id="flavorTableWrap">
      <div class="page-loading"><div class="spinner dark"></div></div>
    </div>
  </div>

  <!-- Modal -->
  <div class="modal-backdrop" id="flavorModal">
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <span class="modal-title" id="flavorModalTitle">Novo Sabor</span>
        <button class="modal-close" onclick="closeFlavorModal()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Nome do Sabor <span style="color:var(--danger)">*</span></label>
          <input type="text" id="flavorName" placeholder="Ex: Frango, Queijo, Camarao..." />
        </div>
        <p id="flavorFormError" style="color:var(--danger);font-size:13px;display:none"></p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeFlavorModal()">Cancelar</button>
        <button class="btn btn-primary" id="saveFlavorBtn" onclick="saveFlavor()">Salvar Sabor</button>
      </div>
    </div>
  </div>`;
}

async function loadFlavors() {
  var wrap = document.getElementById('flavorTableWrap');
  try {
    allFlavorsData = await getFlavors();
    renderList(allFlavorsData);
  } catch(err) {
    showToast('Erro ao carregar sabores.', 'error');
    wrap.innerHTML = '<div class="empty-state"><p>Erro ao carregar dados.</p></div>';
  }
}

function renderList(flavors) {
  var wrap = document.getElementById('flavorTableWrap');
  if (!flavors.length) {
    wrap.innerHTML = '<div class="empty-state"><p>Nenhum sabor cadastrado.</p><small>Clique em "Novo Sabor" para cadastrar.</small></div>';
    return;
  }
  wrap.innerHTML = '<div style="display:flex;flex-direction:column;gap:var(--space-3)">' +
    flavors.map(function(f) {
      return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);box-shadow:var(--shadow-sm);display:flex;align-items:center;justify-content:space-between;gap:var(--space-3)">' +
        '<div>' +
          '<div style="font-size:15px;font-weight:700;color:var(--brand-800)">' + f.name + '</div>' +
          '<div style="font-size:12px;color:var(--text-tertiary);margin-top:2px">Cadastrado em: ' + formatDate(f.created_at ? f.created_at.split('T')[0] : '') + '</div>' +
        '</div>' +
        '<button class="btn-icon" title="Editar" onclick="editFlavor(\'' + f.id + '\',\'' + esc(f.name) + '\')">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
        '</button>' +
      '</div>';
    }).join('') +
  '</div>';
}

function esc(s) { return String(s).replace(/'/g,"\\'"); }

function attachListeners() {
  window.openFlavorModal   = openFlavorModal;
  window.closeFlavorModal  = closeFlavorModal;
  window.saveFlavor        = saveFlavor;
  window.editFlavor        = editFlavor;
  window.filterFlavorTable = filterFlavorTable;
}

function filterFlavorTable() {
  var term = document.getElementById('flavorSearch').value.toLowerCase();
  renderList(allFlavorsData.filter(function(f) { return f.name.toLowerCase().includes(term); }));
}

function openFlavorModal(id, name) {
  editingId = id || null;
  document.getElementById('flavorModalTitle').textContent = editingId ? 'Editar Sabor' : 'Novo Sabor';
  document.getElementById('flavorName').value = name || '';
  document.getElementById('flavorFormError').style.display = 'none';
  openModal('flavorModal');
}

function closeFlavorModal() { closeModal('flavorModal'); editingId = null; }

function editFlavor(id, name) { openFlavorModal(id, name.replace(/\\'/g,"'")); }

async function saveFlavor() {
  if (isSubmitting) return;
  var errEl = document.getElementById('flavorFormError');
  errEl.style.display = 'none';
  var name = document.getElementById('flavorName').value.trim();
  if (!name) { errEl.textContent='O nome do sabor e obrigatorio.'; errEl.style.display='block'; return; }
  if (!editingId) {
    var dup = allFlavorsData.find(function(f) { return f.name.toLowerCase() === name.toLowerCase(); });
    if (dup) { errEl.textContent='Este sabor ja esta cadastrado.'; errEl.style.display='block'; return; }
  }
  isSubmitting = true;
  var btn = document.getElementById('saveFlavorBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Salvando...';
  try {
    if (editingId) { await updateFlavor(editingId, { name: name }); showToast('Sabor atualizado com sucesso.', 'success'); }
    else { await createFlavor(name); showToast('Sabor cadastrado com sucesso.', 'success'); }
    closeFlavorModal();
    await loadFlavors();
  } catch(err) {
    var msg = err.message && err.message.includes('unique') ? 'Este sabor ja esta cadastrado.' : 'Nao foi possivel salvar o sabor.';
    errEl.textContent = msg; errEl.style.display = 'block';
  } finally {
    isSubmitting = false; btn.disabled = false; btn.innerHTML = 'Salvar Sabor';
  }
}

