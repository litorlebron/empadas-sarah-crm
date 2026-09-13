/**
 * EMPADAS DA SARAH – CRM
 * Conciliacao de Pagamentos — admin, mobile-friendly
 */
import { showToast, formatDate, formatBRL, todayISO, openModal, closeModal } from '../js/app.js';
import { getSalesAdminView, getSellers, confirmPayment, revertPayment } from '../js/db.js';

var confirmingId = null;

export async function render(container) {
  container.innerHTML = buildLayout();
  setDefaultFilters();
  await loadSellers();
  await loadConciliation();
  attachListeners();
}

function buildLayout() {
  return `
  <div class="page-header">
    <div><h1>Conciliacao</h1></div>
    <div class="page-actions no-print">
      <button class="btn btn-secondary" onclick="printConciliation()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Imprimir
      </button>
    </div>
  </div>
  <div class="page-body">
    <div class="filter-bar no-print">
      <div class="filter-group">
        <label>De</label>
        <input type="date" id="concilDateFrom" onchange="loadConciliation()" />
        <label>Ate</label>
        <input type="date" id="concilDateTo" onchange="loadConciliation()" />
      </div>
      <div class="filter-group">
        <label>Vendedor</label>
        <select id="concilSeller" onchange="loadConciliation()">
          <option value="">Todos</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Status</label>
        <select id="concilStatus" onchange="loadConciliation()">
          <option value="">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
        </select>
      </div>
    </div>

    <div class="kpi-grid" id="concilKpis" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:var(--space-4)"></div>

    <div id="concilTableWrap">
      <div class="page-loading"><div class="spinner dark"></div></div>
    </div>
  </div>

  <!-- Modal confirmar pagamento -->
  <div class="modal-backdrop" id="paymentModal">
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <span class="modal-title">Confirmar Pagamento</span>
        <button class="modal-close" onclick="closeModal('paymentModal')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Data do Pagamento <span style="color:var(--danger)">*</span></label>
          <input type="date" id="paymentDate" />
        </div>
        <p id="paymentError" style="color:var(--danger);font-size:13px;display:none"></p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('paymentModal')">Cancelar</button>
        <button class="btn btn-success" id="confirmPayBtn" onclick="doConfirmPayment()">Confirmar Pagamento</button>
      </div>
    </div>
  </div>`;
}

function setDefaultFilters() {
  var t = todayISO();
  document.getElementById('concilDateFrom').value = t;
  document.getElementById('concilDateTo').value   = t;
  document.getElementById('paymentDate').value    = t;
}

async function loadSellers() {
  try {
    var sellers = await getSellers();
    var sel = document.getElementById('concilSeller');
    sellers.forEach(function(s) {
      sel.innerHTML += '<option value="' + s.id + '">' + s.name + '</option>';
    });
  } catch(_) {}
}

function attachListeners() {
  window.loadConciliation  = loadConciliation;
  window.openPaymentModal  = openPaymentModal;
  window.doConfirmPayment  = doConfirmPayment;
  window.doRevertPayment   = doRevertPayment;
  window.printConciliation = printConciliation;
  window.closeModal        = closeModal;
}

async function loadConciliation() {
  var dateFrom      = document.getElementById('concilDateFrom').value || todayISO();
  var dateTo        = document.getElementById('concilDateTo').value   || todayISO();
  var sellerId      = document.getElementById('concilSeller').value;
  var paymentStatus = document.getElementById('concilStatus').value;
  var wrap = document.getElementById('concilTableWrap');
  wrap.innerHTML = '<div class="page-loading"><div class="spinner dark"></div></div>';
  try {
    var sales = await getSalesAdminView({
      dateFrom: dateFrom, dateTo: dateTo,
      sellerId: sellerId || undefined,
      paymentStatus: paymentStatus || undefined
    });
    renderKPIs(sales);
    renderTable(sales);
  } catch(err) {
    showToast('Erro ao carregar conciliacao.', 'error');
    wrap.innerHTML = '<div class="empty-state"><p>Erro ao carregar dados.</p></div>';
  }
}

function renderKPIs(sales) {
  var total    = sales.reduce(function(a,s){return a+Number(s.amount||0);},0);
  var recebido = sales.filter(function(s){return s.payment_status==='pago';}).reduce(function(a,s){return a+Number(s.amount||0);},0);
  var pendente = total - recebido;
  document.getElementById('concilKpis').innerHTML =
    '<div class="kpi-card"><div class="kpi-label">Total Vendido</div><div class="kpi-value">' + formatBRL(total) + '</div><div class="kpi-sub">' + sales.length + ' venda(s)</div></div>' +
    '<div class="kpi-card"><div class="kpi-label">Recebido</div><div class="kpi-value green">' + formatBRL(recebido) + '</div></div>' +
    '<div class="kpi-card"><div class="kpi-label">Pendente</div><div class="kpi-value amber">' + formatBRL(pendente) + '</div></div>';
}

function renderTable(sales) {
  var wrap = document.getElementById('concilTableWrap');
  if (!sales.length) {
    wrap.innerHTML = '<div class="empty-state"><p>Nenhuma venda encontrada.</p></div>';
    return;
  }
  var rows = sales.map(function(s) {
    var statusBadge = '<span class="badge badge-' + (s.payment_status==='pago'?'paid':'pending') + '">' + (s.payment_status==='pago'?'Pago':'Pendente') + '</span>';
    var action = s.payment_status === 'pendente'
      ? '<button class="btn btn-success btn-sm" onclick="openPaymentModal(\'' + s.id + '\')">Confirmar</button>'
      : '<button class="btn btn-secondary btn-sm" onclick="doRevertPayment(\'' + s.id + '\')">Reverter</button>';
    return '<tr style="' + (s.payment_status==='pendente'?'background:var(--warning-bg)':'') + '">' +
      '<td data-label="Data">'     + formatDate(s.sale_date) + '</td>' +
      '<td data-label="Cliente">'  + s.client_name + '</td>' +
      '<td data-label="Sabor">'    + s.flavor_name + '</td>' +
      '<td data-label="Bandejas">' + s.quantity + '</td>' +
      '<td data-label="Valor">'    + formatBRL(s.amount) + '</td>' +
      '<td data-label="Vendedor">' + s.seller_name + '</td>' +
      '<td data-label="Status">'   + statusBadge + '</td>' +
      '<td data-label="Pago em">'  + (s.payment_date ? formatDate(s.payment_date) : '—') + '</td>' +
      '<td>' + action + '</td>' +
      '</tr>';
  }).join('');

  wrap.innerHTML =
    '<div class="table-wrapper">' +
    '<table><thead><tr><th>Data</th><th>Cliente</th><th>Sabor</th><th>Bdj.</th><th>Valor</th><th>Vendedor</th><th>Status</th><th>Pago em</th><th></th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div>';
}

function openPaymentModal(saleId) {
  confirmingId = saleId;
  document.getElementById('paymentDate').value = todayISO();
  document.getElementById('paymentError').style.display = 'none';
  openModal('paymentModal');
}

async function doConfirmPayment() {
  var date = document.getElementById('paymentDate').value;
  var errEl = document.getElementById('paymentError');
  if (!date) { errEl.textContent='Informe a data do pagamento.'; errEl.style.display='block'; return; }
  var btn = document.getElementById('confirmPayBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Salvando...';
  try {
    await confirmPayment(confirmingId, date);
    showToast('Pagamento confirmado com sucesso.', 'success');
    closeModal('paymentModal');
    loadConciliation();
  } catch(err) {
    errEl.textContent = 'Erro ao confirmar pagamento.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Confirmar Pagamento';
  }
}

async function doRevertPayment(saleId) {
  if (!confirm('Reverter este pagamento para "Pendente"?')) return;
  try {
    await revertPayment(saleId);
    showToast('Pagamento revertido para pendente.', 'info');
    loadConciliation();
  } catch(err) { showToast('Erro ao reverter pagamento.', 'error'); }
}

function printConciliation() {
  window.print();
}

