/**
 * EMPADAS DA SARAH – CRM
 * Dashboard do Vendedor — mobile-friendly
 */
import { showToast, formatDate, todayISO } from '../js/app.js';
import { getSalesSellerView } from '../js/db.js';

var chartInstance = null;

export async function render(container) {
  container.innerHTML = buildLayout();
  setDefaultFilters();
  attachListeners();
  await loadDashboard();
}

function buildLayout() {
  return `
  <div class="page-header">
    <div><h1>Dashboard</h1></div>
  </div>
  <div class="page-body">
    <div class="filter-bar no-print">
      <div class="filter-tabs" id="dashFilterTabs">
        <button class="filter-tab active" data-range="today"    onclick="setRange('today')">Hoje</button>
        <button class="filter-tab"        data-range="yesterday" onclick="setRange('yesterday')">Ontem</button>
        <button class="filter-tab"        data-range="week"     onclick="setRange('week')">Semana</button>
        <button class="filter-tab"        data-range="month"    onclick="setRange('month')">Mes</button>
        <button class="filter-tab"        data-range="custom"   onclick="setRange('custom')">Personalizado</button>
      </div>
      <div class="filter-group" id="customRangeGroup" style="display:none">
        <label>De</label><input type="date" id="dateFrom" />
        <label>Ate</label><input type="date" id="dateTo" />
        <button class="btn btn-primary btn-sm" onclick="loadDashboard()">Aplicar</button>
      </div>
    </div>

    <div class="kpi-grid" id="kpiGrid">
      <div class="kpi-card"><div class="kpi-label">Vendas realizadas</div><div class="kpi-value">—</div></div>
      <div class="kpi-card"><div class="kpi-label">Bandejas vendidas</div><div class="kpi-value">—</div></div>
      <div class="kpi-card"><div class="kpi-label">Clientes atendidos</div><div class="kpi-value">—</div></div>
    </div>

    <div class="two-col" style="margin-bottom:var(--space-4)">
      <div class="card">
        <div class="card-header"><div><div class="card-title">Vendas por Sabor</div><div class="card-subtitle">Quantidade de bandejas</div></div></div>
        <div style="position:relative;height:200px"><canvas id="saborChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Ranking de Sabores</div></div>
        <div id="rankingList"><div class="page-loading"><div class="spinner dark"></div></div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Ultimas Vendas</div></div>
      <div id="lastSalesWrap"><div class="page-loading"><div class="spinner dark"></div></div></div>
    </div>
  </div>`;
}

function setDefaultFilters() {
  var t = todayISO();
  if (document.getElementById('dateFrom')) document.getElementById('dateFrom').value = t;
  if (document.getElementById('dateTo'))   document.getElementById('dateTo').value   = t;
}

function attachListeners() {
  window.setRange = function(range) {
    document.querySelectorAll('#dashFilterTabs .filter-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.range === range);
    });
    var g = document.getElementById('customRangeGroup');
    var now = new Date();
    function fmt(d) { return d.toISOString().split('T')[0]; }
    var df = document.getElementById('dateFrom');
    var dt = document.getElementById('dateTo');
    g.style.display = 'none';
    if (range === 'today') {
      df.value = dt.value = fmt(now); loadDashboard();
    } else if (range === 'yesterday') {
      var y = new Date(now); y.setDate(y.getDate()-1);
      df.value = dt.value = fmt(y); loadDashboard();
    } else if (range === 'week') {
      var s = new Date(now); s.setDate(now.getDate()-6);
      df.value = fmt(s); dt.value = fmt(now); loadDashboard();
    } else if (range === 'month') {
      df.value = fmt(now).slice(0,8)+'01'; dt.value = fmt(now); loadDashboard();
    } else {
      g.style.display = 'flex';
    }
  };
  window.loadDashboard = loadDashboard;
}

async function loadDashboard() {
  var dateFrom = document.getElementById('dateFrom') ? document.getElementById('dateFrom').value : todayISO();
  var dateTo   = document.getElementById('dateTo')   ? document.getElementById('dateTo').value   : todayISO();
  try {
    var sales = await getSalesSellerView({ dateFrom: dateFrom, dateTo: dateTo });
    renderKPIs(sales);
    renderChart(sales);
    renderRanking(sales);
    renderLastSales(sales);
  } catch(err) {
    showToast('Erro ao carregar dashboard.', 'error');
    console.error(err);
  }
}

function renderKPIs(sales) {
  var totalSales    = countOrders(sales);
  var totalBandejas = sales.reduce(function(s,v){return s+(v.quantity||0);},0);
  var uniqueClients = new Set(sales.map(function(v){return v.client_id;})).size;
  document.getElementById('kpiGrid').innerHTML =
    '<div class="kpi-card"><div class="kpi-label">Vendas realizadas</div><div class="kpi-value">' + totalSales + '</div></div>' +
    '<div class="kpi-card"><div class="kpi-label">Bandejas vendidas</div><div class="kpi-value">' + totalBandejas + '</div></div>' +
    '<div class="kpi-card"><div class="kpi-label">Clientes atendidos</div><div class="kpi-value">' + uniqueClients + '</div></div>';
}

function renderChart(sales) {
  var byFlavor = {};
  sales.forEach(function(s) {
    var name = s.flavor_name || 'Sem sabor';
    byFlavor[name] = (byFlavor[name]||0) + (s.quantity||0);
  });
  var sorted = Object.entries(byFlavor).sort(function(a,b){return b[1]-a[1];}).slice(0,8);
  var labels = sorted.map(function(e){return e[0];});
  var values = sorted.map(function(e){return e[1];});
  if (chartInstance) { try { chartInstance.destroy(); } catch(_) {} chartInstance = null; }
  var ctx = document.getElementById('saborChart');
  if (!ctx) return;
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ label: 'Bandejas', data: values,
        backgroundColor: '#c9506f', borderRadius: 5, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f9eef2' } },
        x: { grid: { display: false }, ticks: { font: { size: 10 } } }
      }
    }
  });
}

function renderRanking(sales) {
  var byFlavor = {};
  sales.forEach(function(s) {
    var name = s.flavor_name || 'Sem sabor';
    byFlavor[name] = (byFlavor[name]||0) + (s.quantity||0);
  });
  var sorted = Object.entries(byFlavor).sort(function(a,b){return b[1]-a[1];});
  var wrap = document.getElementById('rankingList');
  if (!sorted.length) {
    wrap.innerHTML = '<div class="empty-state"><p>Nenhuma venda no periodo.</p></div>';
    return;
  }
  wrap.innerHTML = '<div class="rank-list">' + sorted.map(function(e,i) {
    return '<div class="rank-item"><div class="rank-number ' + (i<3?'top':'') + '">' + (i+1) + '</div><div class="rank-name">' + e[0] + '</div><div class="rank-value">' + e[1] + ' bdj.</div></div>';
  }).join('') + '</div>';
}

function renderLastSales(sales) {
  var wrap = document.getElementById('lastSalesWrap');
  var last = sales.slice(0, 10);
  if (!last.length) {
    wrap.innerHTML = '<div class="empty-state"><p>Nenhuma venda no periodo.</p></div>';
    return;
  }
  var rows = last.map(function(s) {
    return '<tr>' +
      '<td data-label="Data">'    + formatDate(s.sale_date) + '</td>' +
      '<td data-label="Cliente">' + s.client_name + '</td>' +
      '<td data-label="Sabor">'   + s.flavor_name + '</td>' +
      '<td data-label="Bdj.">'    + s.quantity + '</td>' +
      '<td data-label="Status"><span class="badge badge-' + (s.payment_status==='pago'?'paid':'pending') + '">' + (s.payment_status==='pago'?'Pago':'Pendente') + '</span></td>' +
      '</tr>';
  }).join('');
  wrap.innerHTML =
    '<div class="table-wrapper">' +
    '<table><thead><tr><th>Data</th><th>Cliente</th><th>Sabor</th><th>Bdj.</th><th>Status</th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div>';
}

// Conta vendas (pedidos): linhas com o mesmo order_id contam como 1.
// Vendas antigas, sem order_id, contam cada uma como 1.
function countOrders(sales) {
  var seen = {};
  sales.forEach(function(s) { seen[s.order_id || s.id] = true; });
  return Object.keys(seen).length;
}
