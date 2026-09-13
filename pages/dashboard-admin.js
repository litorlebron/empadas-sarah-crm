/**
 * EMPADAS DA SARAH – CRM
 * Dashboard Administrativo
 */
import { showToast, formatBRL, formatDate, todayISO } from '../js/app.js';
import { getSalesAdminView, getExpenses } from '../js/db.js';

let chartSellers = null, chartFlavors = null, chartPayments = null, chartEvolution = null;

export async function render(container) {
  container.innerHTML = buildLayout();
  setDefaultFilters();
  attachListeners();
  await loadAdminDashboard();
}

function buildLayout() {
  return `
  <div class="page-header">
    <div><h1>Dashboard Administrativo</h1></div>
  </div>
  <div class="page-body">
    <div class="filter-bar no-print">
      <div class="filter-tabs" id="dashFilterTabs">
        <button class="filter-tab active" data-range="today"  onclick="adminSetRange('today')">Hoje</button>
        <button class="filter-tab" data-range="week"          onclick="adminSetRange('week')">Semana</button>
        <button class="filter-tab" data-range="month"         onclick="adminSetRange('month')">Mes</button>
        <button class="filter-tab" data-range="year"          onclick="adminSetRange('year')">Ano</button>
        <button class="filter-tab" data-range="custom"        onclick="adminSetRange('custom')">Personalizado</button>
      </div>
      <div class="filter-group" id="customRangeGroup" style="display:none">
        <label>De</label>
        <input type="date" id="dateFrom" />
        <label>Ate</label>
        <input type="date" id="dateTo" />
        <button class="btn btn-primary btn-sm" onclick="loadAdminDashboard()">Aplicar</button>
      </div>
    </div>

    <div class="kpi-grid" id="kpiGrid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
      ${[...Array(6)].map(() => `<div class="kpi-card"><div class="kpi-label">&nbsp;</div><div class="kpi-value">—</div></div>`).join('')}
    </div>

    <div class="two-col" style="margin-bottom:var(--space-5)">
      <div class="card">
        <div class="card-header"><div><div class="card-title">Evolucao de Vendas</div><div class="card-subtitle">Por dia no periodo</div></div></div>
        <div style="position:relative;height:200px"><canvas id="chartEvolution"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div><div class="card-title">Vendas por Vendedor</div><div class="card-subtitle">Valor total (R$)</div></div></div>
        <div style="position:relative;height:200px"><canvas id="chartSellers"></canvas></div>
      </div>
    </div>

    <div class="two-col" style="margin-bottom:var(--space-5)">
      <div class="card">
        <div class="card-header"><div><div class="card-title">Vendas por Sabor</div><div class="card-subtitle">Bandejas vendidas</div></div></div>
        <div style="position:relative;height:200px"><canvas id="chartFlavors"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div><div class="card-title">Status de Pagamentos</div></div></div>
        <div style="position:relative;height:200px"><canvas id="chartPayments"></canvas></div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-header"><div class="card-title">Ultimas Vendas</div></div>
        <div id="lastSalesWrap"><div class="page-loading"><div class="spinner dark"></div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Clientes com Pendencias</div></div>
        <div id="debtorsWrap"><div class="page-loading"><div class="spinner dark"></div></div></div>
      </div>
    </div>
  </div>`;
}

function setDefaultFilters() {
  const t = todayISO();
  const df = document.getElementById('dateFrom');
  const dt = document.getElementById('dateTo');
  if (df) df.value = t;
  if (dt) dt.value = t;
}

function attachListeners() {
  window.adminSetRange = function(range) {
    document.querySelectorAll('#dashFilterTabs .filter-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.range === range);
    });
    var g = document.getElementById('customRangeGroup');
    var t = new Date();
    var df = document.getElementById('dateFrom');
    var dt = document.getElementById('dateTo');
    function fmt(d) { return d.toISOString().split('T')[0]; }

    g.style.display = 'none';
    if (range === 'today') {
      df.value = dt.value = fmt(t);
      loadAdminDashboard();
    } else if (range === 'week') {
      var s = new Date(t); s.setDate(t.getDate() - 6);
      df.value = fmt(s); dt.value = fmt(t);
      loadAdminDashboard();
    } else if (range === 'month') {
      df.value = fmt(t).slice(0,8) + '01'; dt.value = fmt(t);
      loadAdminDashboard();
    } else if (range === 'year') {
      df.value = fmt(t).slice(0,5) + '01-01'; dt.value = fmt(t);
      loadAdminDashboard();
    } else {
      g.style.display = 'flex';
    }
  };

  window.loadAdminDashboard = loadAdminDashboard;
}

async function loadAdminDashboard() {
  var dateFrom = document.getElementById('dateFrom') ? document.getElementById('dateFrom').value : todayISO();
  var dateTo   = document.getElementById('dateTo')   ? document.getElementById('dateTo').value   : todayISO();

  try {
    var results = await Promise.all([
      getSalesAdminView({ dateFrom: dateFrom, dateTo: dateTo }),
      getExpenses({ dateFrom: dateFrom, dateTo: dateTo })
    ]);
    var sales    = results[0];
    var expenses = results[1];

    renderKPIs(sales, expenses);
    renderEvolutionChart(sales);
    renderSellersChart(sales);
    renderFlavorsChart(sales);
    renderPaymentsChart(sales);
    renderLastSales(sales);
    renderDebtors(sales);
  } catch(err) {
    showToast('Erro ao carregar dashboard.', 'error');
    console.error(err);
  }
}

function renderKPIs(sales, expenses) {
  var totalVendido  = sales.reduce(function(s,v) { return s + Number(v.amount||0); }, 0);
  var totalRecebido = sales.filter(function(v) { return v.payment_status === 'pago'; }).reduce(function(s,v) { return s + Number(v.amount||0); }, 0);
  var totalPendente = totalVendido - totalRecebido;
  var totalDespesas = expenses.reduce(function(s,e) { return s + Number(e.amount||0); }, 0);
  var resultado     = totalRecebido - totalDespesas;
  var totalBandejas = sales.reduce(function(s,v) { return s + (v.quantity||0); }, 0);

  document.getElementById('kpiGrid').innerHTML =
    '<div class="kpi-card"><div class="kpi-label">Total Vendido</div><div class="kpi-value">' + formatBRL(totalVendido) + '</div><div class="kpi-sub">' + sales.length + ' vendas</div></div>' +
    '<div class="kpi-card"><div class="kpi-label">Recebido</div><div class="kpi-value green">' + formatBRL(totalRecebido) + '</div></div>' +
    '<div class="kpi-card"><div class="kpi-label">Pendente</div><div class="kpi-value amber">' + formatBRL(totalPendente) + '</div></div>' +
    '<div class="kpi-card"><div class="kpi-label">Despesas</div><div class="kpi-value red">' + formatBRL(totalDespesas) + '</div></div>' +
    '<div class="kpi-card"><div class="kpi-label">Resultado</div><div class="kpi-value ' + (resultado >= 0 ? 'green' : 'red') + '">' + formatBRL(resultado) + '</div></div>' +
    '<div class="kpi-card"><div class="kpi-label">Bandejas</div><div class="kpi-value">' + totalBandejas + '</div></div>';
}

function destroyChart(ref) { try { if(ref) ref.destroy(); } catch(_) {} }

function renderEvolutionChart(sales) {
  destroyChart(chartEvolution);
  var byDay = {};
  sales.forEach(function(s) { byDay[s.sale_date] = (byDay[s.sale_date]||0) + Number(s.amount||0); });
  var days = Object.keys(byDay).sort();
  var ctx = document.getElementById('chartEvolution');
  if (!ctx) return;
  chartEvolution = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.map(function(d) { var p=d.split('-'); return p[2]+'/'+p[1]; }),
      datasets: [{ label: 'Vendas (R$)', data: days.map(function(d){return byDay[d];}),
        borderColor: '#922847', backgroundColor: 'rgba(146,40,71,.1)', tension: .3, fill: true, pointRadius: 3 }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: '#f9eef2' } }, x: { grid: { display: false } } } }
  });
}

function renderSellersChart(sales) {
  destroyChart(chartSellers);
  var bySeller = {};
  sales.forEach(function(s) { bySeller[s.seller_name] = (bySeller[s.seller_name]||0) + Number(s.amount||0); });
  var entries = Object.entries(bySeller).sort(function(a,b){return b[1]-a[1];});
  var ctx = document.getElementById('chartSellers');
  if (!ctx) return;
  chartSellers = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: entries.map(function(e){return e[0];}),
      datasets: [{ data: entries.map(function(e){return e[1];}),
        backgroundColor: ['#922847','#c9506f','#7a2040','#e8789a'], borderRadius: 6, borderSkipped: false }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: '#f9eef2' } }, x: { grid: { display: false } } } }
  });
}

function renderFlavorsChart(sales) {
  destroyChart(chartFlavors);
  var byFlavor = {};
  sales.forEach(function(s) { byFlavor[s.flavor_name] = (byFlavor[s.flavor_name]||0) + (s.quantity||0); });
  var entries = Object.entries(byFlavor).sort(function(a,b){return b[1]-a[1];}).slice(0,8);
  var ctx = document.getElementById('chartFlavors');
  if (!ctx) return;
  chartFlavors = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: entries.map(function(e){return e[0];}),
      datasets: [{ data: entries.map(function(e){return e[1];}),
        backgroundColor: '#c9506f', borderRadius: 6, borderSkipped: false }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f9eef2' } }, x: { grid: { display: false } } } }
  });
}

function renderPaymentsChart(sales) {
  destroyChart(chartPayments);
  var paid    = sales.filter(function(s){return s.payment_status==='pago';}).reduce(function(a,s){return a+Number(s.amount||0);},0);
  var pending = sales.filter(function(s){return s.payment_status==='pendente';}).reduce(function(a,s){return a+Number(s.amount||0);},0);
  var ctx = document.getElementById('chartPayments');
  if (!ctx) return;
  chartPayments = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pago', 'Pendente'],
      datasets: [{ data: [paid, pending], backgroundColor: ['#1a7f4e','#b45309'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } } } }
  });
}

function renderLastSales(sales) {
  var wrap = document.getElementById('lastSalesWrap');
  var last = sales.slice(0, 8);
  if (!last.length) { wrap.innerHTML = '<div class="empty-state"><p>Nenhuma venda no periodo.</p></div>'; return; }
  var rows = last.map(function(s) {
    return '<tr><td>' + formatDate(s.sale_date) + '</td><td>' + s.client_name + '</td><td>' + s.flavor_name + '</td><td>' + s.quantity + '</td><td>' + formatBRL(s.amount) + '</td><td>' + s.seller_name + '</td><td><span class="badge badge-' + (s.payment_status==='pago'?'paid':'pending') + '">' + (s.payment_status==='pago'?'Pago':'Pendente') + '</span></td></tr>';
  }).join('');
  wrap.innerHTML = '<div style="overflow-x:auto"><table><thead><tr><th>Data</th><th>Cliente</th><th>Sabor</th><th>Bdj.</th><th>Valor</th><th>Vendedor</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function renderDebtors(sales) {
  var wrap = document.getElementById('debtorsWrap');
  var byClient = {};
  sales.filter(function(s){return s.payment_status==='pendente';}).forEach(function(s) {
    byClient[s.client_name] = (byClient[s.client_name]||0) + Number(s.amount||0);
  });
  var sorted = Object.entries(byClient).sort(function(a,b){return b[1]-a[1];});
  if (!sorted.length) { wrap.innerHTML = '<div class="empty-state"><p>Nenhuma pendencia no periodo.</p></div>'; return; }
  wrap.innerHTML = '<div>' + sorted.slice(0,8).map(function(e) {
    return '<div class="debtor-item"><span class="debtor-name">' + e[0] + '</span><span class="debtor-amount">' + formatBRL(e[1]) + '</span></div>';
  }).join('') + '</div>';
}
