/**
 * EMPADAS DA SARAH – CRM
 * Página de Vendas — responsiva para mobile
 */
import { showToast, formatDate, formatBRL, todayISO, currentProfile, confirmDialog, openModal, closeModal } from '../js/app.js';
import { getSalesAdminView, getSalesSellerView, getClients, getFlavors, createSale, updateSale, deleteSaleLogic } from '../js/db.js';

var isAdmin = function() { return currentProfile && currentProfile.role === 'admin'; };
var allClients = [], allFlavors = [], editingId = null, isSubmitting = false;

export async function render(container) {
  container.innerHTML = buildLayout();
  setDefaultDate();
  await Promise.all([loadClients(), loadFlavors()]);
  await loadSales();
  attachListeners();
}

function buildLayout() {
  return `
  <div class="page-header">
    <div><h1>Vendas</h1></div>
    <div class="page-actions no-print">
      <button class="btn btn-primary" onclick="openSaleModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nova Venda
      </button>
    </div>
  </div>
  <div class="page-body">
    <div class="filter-bar no-print">
      <div class="filter-tabs" id="salesFilterTabs">
        <button class="filter-tab active" data-range="today" onclick="salesSetRange('today')">Hoje</button>
        <button class="filter-tab" data-range="week"  onclick="salesSetRange('week')">Semana</button>
        <button class="filter-tab" data-range="month" onclick="salesSetRange('month')">Mes</button>
        <button class="filter-tab" data-range="custom" onclick="salesSetRange('custom')">Personalizado</button>
      </div>
      <div class="filter-group" id="salesCustomRange" style="display:none">
        <label>De</label><input type="date" id="salesDateFrom" />
        <label>Ate</label><input type="date" id="salesDateTo" />
        <button class="btn btn-primary btn-sm" onclick="loadSales()">Aplicar</button>
      </div>
    </div>

    <div id="salesTableWrap">
      <div class="page-loading"><div class="spinner dark"></div></div>
    </div>
  </div>

  <!-- Modal Nova/Editar Venda -->
  <div class="modal-backdrop" id="saleModal">
    <div class="modal" style="max-width:520px">
      <div class="modal-header">
        <span class="modal-title" id="saleModalTitle">Nova Venda</span>
        <button class="modal-close" onclick="closeSaleModal()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Cliente <span style="color:var(--danger)">*</span></label>
          <div class="autocomplete-wrap">
            <input type="text" id="saleClientSearch" placeholder="Digite para pesquisar..." autocomplete="off" oninput="filterClients()" />
            <div class="autocomplete-dropdown" id="clientDropdown" style="display:none"></div>
            <input type="hidden" id="saleClientId" />
          </div>
        </div>
        <div class="field">
          <label>Sabor <span style="color:var(--danger)">*</span></label>
          <div class="autocomplete-wrap">
            <input type="text" id="saleFlavorSearch" placeholder="Digite para pesquisar..." autocomplete="off" oninput="filterFlavors()" />
            <div class="autocomplete-dropdown" id="flavorDropdown" style="display:none"></div>
            <input type="hidden" id="saleFlavorId" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
          <div class="field">
            <label>Data <span style="color:var(--danger)">*</span></label>
            <input type="date" id="saleDate" />
          </div>
          <div class="field">
            <label>Bandejas <span style="color:var(--danger)">*</span></label>
            <input type="number" id="saleQty" min="1" placeholder="0" />
          </div>
        </div>
        <div class="field">
          <label>Valor (R$) <span style="color:var(--danger)">*</span></label>
          <input type="text" id="saleAmount" placeholder="0,00" oninput="maskBRL(this)" inputmode="decimal" />
        </div>
        <p id="saleFormError" style="color:var(--danger);font-size:13px;display:none;margin-top:-8px;margin-bottom:8px"></p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeSaleModal()">Cancelar</button>
        <button class="btn btn-primary" id="saveSaleBtn" onclick="saveSale()">Salvar Venda</button>
      </div>
    </div>
  </div>`;
}

function setDefaultDate() {
  var t = todayISO();
  var df = document.getElementById('salesDateFrom');
  var dt = document.getElementById('salesDateTo');
  if (df) df.value = t;
  if (dt) dt.value = t;
}

async function loadClients() {
  try { allClients = await getClients(); } catch(_) { allClients = []; }
}
async function loadFlavors() {
  try { allFlavors = await getFlavors(); } catch(_) { allFlavors = []; }
}

function attachListeners() {
  window.salesSetRange = function(range) {
    document.querySelectorAll('#salesFilterTabs .filter-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.range === range);
    });
    var g = document.getElementById('salesCustomRange');
    var t = new Date();
    function fmt(d) { return d.toISOString().split('T')[0]; }
    var df = document.getElementById('salesDateFrom');
    var dt = document.getElementById('salesDateTo');
    g.style.display = 'none';
    if (range === 'today') { df.value = dt.value = fmt(t); loadSales(); }
    else if (range === 'week') { var s=new Date(t); s.setDate(t.getDate()-6); df.value=fmt(s); dt.value=fmt(t); loadSales(); }
    else if (range === 'month') { df.value=fmt(t).slice(0,8)+'01'; dt.value=fmt(t); loadSales(); }
    else { g.style.display = 'flex'; }
  };
  window.loadSales        = loadSales;
  window.openSaleModal    = openSaleModal;
  window.closeSaleModal   = closeSaleModal;
  window.filterClients    = filterClients;
  window.filterFlavors    = filterFlavors;
  window.saveSale         = saveSale;
  window.editSale         = editSale;
  window.deleteSaleRow    = deleteSaleRow;
  window.maskBRL          = maskBRL;
  window.selectClient     = selectClient;
  window.selectFlavor     = selectFlavor;

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.autocomplete-wrap')) {
      document.querySelectorAll('.autocomplete-dropdown').forEach(function(d) { d.style.display = 'none'; });
    }
  });
}

async function loadSales() {
  var dateFrom = document.getElementById('salesDateFrom') ? document.getElementById('salesDateFrom').value : todayISO();
  var dateTo   = document.getElementById('salesDateTo')   ? document.getElementById('salesDateTo').value   : todayISO();
  var wrap = document.getElementById('salesTableWrap');
  wrap.innerHTML = '<div class="page-loading"><div class="spinner dark"></div></div>';
  try {
    var sales = isAdmin()
      ? await getSalesAdminView({ dateFrom: dateFrom, dateTo: dateTo })
      : await getSalesSellerView({ dateFrom: dateFrom, dateTo: dateTo });
    renderTable(sales);
  } catch(err) {
    showToast('Erro ao carregar vendas.', 'error');
    wrap.innerHTML = '<div class="empty-state"><p>Erro ao carregar dados.</p></div>';
  }
}

function renderTable(sales) {
  var wrap = document.getElementById('salesTableWrap');
  if (!sales.length) {
    wrap.innerHTML = '<div class="empty-state"><p>Nenhuma venda no periodo.</p><small>Clique em "Nova Venda" para registrar.</small></div>';
    return;
  }

  // Desktop: tabela normal | Mobile: cards
  var rows = sales.map(function(s) {
    var statusBadge = '<span class="badge badge-' + (s.payment_status==='pago'?'paid':'pending') + '">' + (s.payment_status==='pago'?'Pago':'Pendente') + '</span>';
    var actions = '<div class="table-actions">' +
      '<button class="btn-icon" title="Editar" onclick="editSale(\'' + s.id + '\',\'' + esc(s.client_name) + '\',\'' + s.client_id + '\',\'' + esc(s.flavor_name) + '\',\'' + s.flavor_id + '\',\'' + s.sale_date + '\',' + s.quantity + ',' + (isAdmin()?s.amount:0) + ')">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
      '</button>' +
      (isAdmin() ? '<button class="btn-icon" title="Excluir" onclick="deleteSaleRow(\'' + s.id + '\')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>' : '') +
      '</div>';

    return '<tr>' +
      '<td data-label="Data">' + formatDate(s.sale_date) + '</td>' +
      '<td data-label="Cliente">' + s.client_name + '</td>' +
      '<td data-label="Sabor">' + s.flavor_name + '</td>' +
      '<td data-label="Bandejas">' + s.quantity + '</td>' +
      (isAdmin() ? '<td data-label="Valor">' + formatBRL(s.amount) + '</td>' : '') +
      '<td data-label="Vendedor">' + s.seller_name + '</td>' +
      '<td data-label="Status">' + statusBadge + '</td>' +
      '<td>' + actions + '</td>' +
      '</tr>';
  }).join('');

  var adminCol = isAdmin() ? '<th>Valor</th>' : '';
  wrap.innerHTML =
    '<div class="table-wrapper table-mobile-cards">' +
    '<table><thead><tr><th>Data</th><th>Cliente</th><th>Sabor</th><th>Bandejas</th>' + adminCol + '<th>Vendedor</th><th>Status</th><th></th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div>';
}

function esc(s) { return String(s).replace(/'/g,"\\'"); }

function openSaleModal(id, clientName, clientId, flavorName, flavorId, date, qty, amount) {
  editingId = id || null;
  document.getElementById('saleModalTitle').textContent = editingId ? 'Editar Venda' : 'Nova Venda';
  document.getElementById('saleClientSearch').value = clientName || '';
  document.getElementById('saleClientId').value     = clientId  || '';
  document.getElementById('saleFlavorSearch').value = flavorName || '';
  document.getElementById('saleFlavorId').value     = flavorId  || '';
  document.getElementById('saleDate').value         = date || todayISO();
  document.getElementById('saleQty').value          = qty  || '';
  document.getElementById('saleAmount').value       = amount ? Number(amount).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '';
  document.getElementById('saleFormError').style.display = 'none';
  openModal('saleModal');
}

function closeSaleModal() { closeModal('saleModal'); editingId = null; }

function editSale(id, clientName, clientId, flavorName, flavorId, date, qty, amount) {
  openSaleModal(id, clientName.replace(/\\'/g,"'"), clientId, flavorName.replace(/\\'/g,"'"), flavorId, date, qty, amount);
}

async function deleteSaleRow(id) {
  var ok = await confirmDialog('Deseja excluir esta venda?');
  if (!ok) return;
  try {
    await deleteSaleLogic(id);
    showToast('Venda excluida com sucesso.', 'success');
    loadSales();
  } catch(err) { showToast('Nao foi possivel excluir a venda.', 'error'); }
}

function filterClients() {
  var term = document.getElementById('saleClientSearch').value.toLowerCase();
  var drop = document.getElementById('clientDropdown');
  document.getElementById('saleClientId').value = '';
  if (!term) { drop.style.display = 'none'; return; }
  var filtered = allClients.filter(function(c){ return c.name.toLowerCase().includes(term); }).slice(0,8);
  if (!filtered.length) { drop.style.display = 'none'; return; }
  drop.innerHTML = filtered.map(function(c) {
    return '<div class="autocomplete-item" onclick="selectClient(\'' + c.id + '\',\'' + esc(c.name) + '\')">' + c.name + '</div>';
  }).join('');
  drop.style.display = 'block';
}

function selectClient(id, name) {
  document.getElementById('saleClientSearch').value = name.replace(/\\'/g,"'");
  document.getElementById('saleClientId').value     = id;
  document.getElementById('clientDropdown').style.display = 'none';
}

function filterFlavors() {
  var term = document.getElementById('saleFlavorSearch').value.toLowerCase();
  var drop = document.getElementById('flavorDropdown');
  document.getElementById('saleFlavorId').value = '';
  if (!term) { drop.style.display = 'none'; return; }
  var filtered = allFlavors.filter(function(f){ return f.name.toLowerCase().includes(term); }).slice(0,8);
  if (!filtered.length) { drop.style.display = 'none'; return; }
  drop.innerHTML = filtered.map(function(f) {
    return '<div class="autocomplete-item" onclick="selectFlavor(\'' + f.id + '\',\'' + esc(f.name) + '\')">' + f.name + '</div>';
  }).join('');
  drop.style.display = 'block';
}

function selectFlavor(id, name) {
  document.getElementById('saleFlavorSearch').value = name.replace(/\\'/g,"'");
  document.getElementById('saleFlavorId').value     = id;
  document.getElementById('flavorDropdown').style.display = 'none';
}

function maskBRL(input) {
  var v = input.value.replace(/\D/g,'');
  v = (parseInt(v,10)||0) / 100;
  input.value = v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function parseBRL(str) { return parseFloat(String(str).replace(/\./g,'').replace(',','.')) || 0; }

async function saveSale() {
  if (isSubmitting) return;
  var errEl = document.getElementById('saleFormError');
  errEl.style.display = 'none';

  var clientId = document.getElementById('saleClientId').value;
  var flavorId = document.getElementById('saleFlavorId').value;
  var saleDate = document.getElementById('saleDate').value;
  var qty      = parseInt(document.getElementById('saleQty').value, 10);
  var amount   = parseBRL(document.getElementById('saleAmount').value);

  if (!clientId) { errEl.textContent='Selecione um cliente.'; errEl.style.display='block'; return; }
  if (!flavorId) { errEl.textContent='Selecione um sabor.'; errEl.style.display='block'; return; }
  if (!saleDate) { errEl.textContent='Informe a data.'; errEl.style.display='block'; return; }
  if (!qty||qty<=0) { errEl.textContent='Informe a quantidade.'; errEl.style.display='block'; return; }
  if (!amount||amount<=0) { errEl.textContent='Informe o valor.'; errEl.style.display='block'; return; }

  isSubmitting = true;
  var btn = document.getElementById('saveSaleBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Salvando...';

  try {
    var payload = { client_id:clientId, flavor_id:flavorId, sale_date:saleDate, quantity:qty, amount:amount };
    if (editingId) {
      await updateSale(editingId, payload);
      showToast('Venda atualizada com sucesso.', 'success');
    } else {
      await createSale(payload);
      showToast('Venda registrada com sucesso.', 'success');
    }
    closeSaleModal();
    loadSales();
  } catch(err) {
    errEl.textContent = 'Nao foi possivel salvar a venda. Tente novamente.';
    errEl.style.display = 'block';
    console.error(err);
  } finally {
    isSubmitting = false;
    btn.disabled = false;
    btn.innerHTML = 'Salvar Venda';
  }
}
