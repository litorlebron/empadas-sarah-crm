/**
 * EMPADAS DA SARAH – CRM
 * Despesas — somente admin
 */
import { showToast, formatDate, formatBRL, todayISO, openModal, closeModal, confirmDialog } from '../js/app.js';
import { getExpenses, createExpense, updateExpense, deleteExpenseLogic } from '../js/db.js';

const CATEGORIES = [
  'Materia-prima','Embalagens','Transporte','Funcionarios','Aluguel',
  'Energia','Agua','Internet','Marketing','Impostos','Outros'
];
const PAYMENT_METHODS = ['Dinheiro','Pix','Cartao de debito','Cartao de credito','Transferencia','Boleto'];

let editingId = null, isSubmitting = false, allExpensesData = [];

export async function render(container) {
  container.innerHTML = buildLayout();
  setDefaultFilters();
  await loadExpenses();
  attachListeners();
}

function buildLayout() {
  return `
  <div class="page-header">
    <div><h1>Despesas</h1></div>
    <div class="page-actions no-print">
      <button class="btn btn-primary" onclick="openExpenseModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nova Despesa
      </button>
    </div>
  </div>
  <div class="page-body">
    <!-- Filtros -->
    <div class="filter-bar no-print">
      <div class="filter-group">
        <label>De</label>
        <input type="date" id="expDateFrom" onchange="loadExpenses()" />
        <label>Ate</label>
        <input type="date" id="expDateTo" onchange="loadExpenses()" />
      </div>
      <div class="filter-group">
        <label>Categoria</label>
        <select id="expCategory" onchange="loadExpenses()">
          <option value="">Todas</option>
          ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- KPI total -->
    <div class="kpi-grid" id="expKpi" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:var(--space-5)"></div>

    <div class="table-wrapper" id="expTableWrap">
      <div class="page-loading"><div class="spinner dark"></div></div>
    </div>
  </div>

  <!-- Modal -->
  <div class="modal-backdrop" id="expenseModal">
    <div class="modal" style="max-width:500px">
      <div class="modal-header">
        <span class="modal-title" id="expModalTitle">Nova Despesa</span>
        <button class="modal-close" onclick="closeModal('expenseModal')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Descricao <span style="color:var(--danger)">*</span></label>
          <input type="text" id="expDesc" placeholder="Ex: Farinha de trigo..." />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
          <div class="field">
            <label>Categoria <span style="color:var(--danger)">*</span></label>
            <select id="expCat">
              <option value="">Selecione...</option>
              ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Data <span style="color:var(--danger)">*</span></label>
            <input type="date" id="expDate" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
          <div class="field">
            <label>Valor (R$) <span style="color:var(--danger)">*</span></label>
            <input type="text" id="expAmount" placeholder="0,00" oninput="maskBRLExp(this)" />
          </div>
          <div class="field">
            <label>Forma de Pagamento</label>
            <select id="expPayMethod">
              <option value="">Selecione...</option>
              ${PAYMENT_METHODS.map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field">
          <label>Observacao</label>
          <textarea id="expNotes" placeholder="Observacoes adicionais..."></textarea>
        </div>
        <p id="expFormError" style="color:var(--danger);font-size:13px;display:none"></p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('expenseModal')">Cancelar</button>
        <button class="btn btn-primary" id="saveExpBtn" onclick="saveExpense()">Salvar Despesa</button>
      </div>
    </div>
  </div>`;
}

function setDefaultFilters() {
  const t = todayISO();
  const y = new Date(); y.setDate(1);
  document.getElementById('expDateFrom').value = y.toISOString().split('T')[0].slice(0,8) + '01';
  document.getElementById('expDateTo').value   = t;
  document.getElementById('expDate').value     = t;
}

function attachListeners() {
  window.loadExpenses     = loadExpenses;
  window.openExpenseModal = openExpenseModal;
  window.closeModal       = closeModal;
  window.saveExpense      = saveExpense;
  window.editExpense      = editExpense;
  window.deleteExpenseRow = deleteExpenseRow;
  window.maskBRLExp       = maskBRLExp;
}

async function loadExpenses() {
  const dateFrom = document.getElementById('expDateFrom').value;
  const dateTo   = document.getElementById('expDateTo').value;
  const category = document.getElementById('expCategory').value;
  const wrap = document.getElementById('expTableWrap');
  wrap.innerHTML = `<div class="page-loading"><div class="spinner dark"></div></div>`;
  try {
    allExpensesData = await getExpenses({ dateFrom, dateTo, category: category || undefined });
    renderKPI(allExpensesData);
    renderTable(allExpensesData);
  } catch(err) {
    showToast('Erro ao carregar despesas.', 'error');
    wrap.innerHTML = `<div class="empty-state"><p>Erro ao carregar dados.</p></div>`;
  }
}

function renderKPI(expenses) {
  const total = expenses.reduce((a, e) => a + Number(e.amount||0), 0);
  document.getElementById('expKpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Total de Despesas</div><div class="kpi-value red">${formatBRL(total)}</div><div class="kpi-sub">${expenses.length} lancamento(s)</div></div>`;
}

function renderTable(expenses) {
  const wrap = document.getElementById('expTableWrap');
  if (!expenses.length) {
    wrap.innerHTML = `<div class="empty-state"><p>Nenhuma despesa no periodo.</p></div>`;
    return;
  }
  wrap.innerHTML = `
    <table>
      <thead><tr><th>Data</th><th>Descricao</th><th>Categoria</th><th>Forma Pag.</th><th>Valor</th><th></th></tr></thead>
      <tbody>
        ${expenses.map(e => `
          <tr>
            <td>${formatDate(e.expense_date)}</td>
            <td>${e.description}</td>
            <td>${e.category}</td>
            <td>${e.payment_method || '—'}</td>
            <td>${formatBRL(e.amount)}</td>
            <td>
              <div class="table-actions">
                <button class="btn-icon" title="Editar" onclick="editExpense('${e.id}')">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn-icon" title="Excluir" onclick="deleteExpenseRow('${e.id}')">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function openExpenseModal(id) {
  editingId = id || null;
  document.getElementById('expModalTitle').textContent = editingId ? 'Editar Despesa' : 'Nova Despesa';
  if (!id) {
    document.getElementById('expDesc').value      = '';
    document.getElementById('expCat').value       = '';
    document.getElementById('expDate').value      = todayISO();
    document.getElementById('expAmount').value    = '';
    document.getElementById('expPayMethod').value = '';
    document.getElementById('expNotes').value     = '';
  }
  document.getElementById('expFormError').style.display = 'none';
  openModal('expenseModal');
}

function editExpense(id) {
  const e = allExpensesData.find(x => x.id === id);
  if (!e) return;
  editingId = id;
  document.getElementById('expModalTitle').textContent = 'Editar Despesa';
  document.getElementById('expDesc').value      = e.description;
  document.getElementById('expCat').value       = e.category;
  document.getElementById('expDate').value      = e.expense_date;
  document.getElementById('expAmount').value    = Number(e.amount).toLocaleString('pt-BR',{minimumFractionDigits:2});
  document.getElementById('expPayMethod').value = e.payment_method || '';
  document.getElementById('expNotes').value     = e.notes || '';
  document.getElementById('expFormError').style.display = 'none';
  openModal('expenseModal');
}

async function deleteExpenseRow(id) {
  const ok = await confirmDialog('Excluir esta despesa?');
  if (!ok) return;
  try {
    await deleteExpenseLogic(id);
    showToast('Despesa excluida com sucesso.', 'success');
    loadExpenses();
  } catch(err) { showToast('Erro ao excluir despesa.', 'error'); }
}

function maskBRLExp(input) {
  let v = input.value.replace(/\D/g, '');
  v = (parseInt(v, 10) || 0) / 100;
  input.value = v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseBRL(str) { return parseFloat(String(str).replace(/\./g,'').replace(',','.')) || 0; }

async function saveExpense() {
  if (isSubmitting) return;
  const errEl = document.getElementById('expFormError');
  errEl.style.display = 'none';

  const description    = document.getElementById('expDesc').value.trim();
  const category       = document.getElementById('expCat').value;
  const expense_date   = document.getElementById('expDate').value;
  const amount         = parseBRL(document.getElementById('expAmount').value);
  const payment_method = document.getElementById('expPayMethod').value || null;
  const notes          = document.getElementById('expNotes').value.trim() || null;

  if (!description)   { errEl.textContent = 'Informe a descricao.'; errEl.style.display = 'block'; return; }
  if (!category)      { errEl.textContent = 'Selecione a categoria.'; errEl.style.display = 'block'; return; }
  if (!expense_date)  { errEl.textContent = 'Informe a data.'; errEl.style.display = 'block'; return; }
  if (!amount)        { errEl.textContent = 'Informe o valor.'; errEl.style.display = 'block'; return; }

  isSubmitting = true;
  const btn = document.getElementById('saveExpBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Salvando...';

  try {
    const payload = { description, category, expense_date, amount, payment_method, notes };
    if (editingId) {
      await updateExpense(editingId, payload);
      showToast('Despesa atualizada com sucesso.', 'success');
    } else {
      await createExpense(payload);
      showToast('Despesa registrada com sucesso.', 'success');
    }
    closeModal('expenseModal');
    await loadExpenses();
  } catch(err) {
    errEl.textContent = 'Nao foi possivel salvar a despesa.';
    errEl.style.display = 'block';
    console.error(err);
  } finally {
    isSubmitting = false;
    btn.disabled = false;
    btn.innerHTML = 'Salvar Despesa';
  }
}
