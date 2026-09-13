/**
 * EMPADAS DA SARAH – CRM
 * Relatorios — mobile-friendly, nomes à esquerda
 */
import { showToast, formatDate, formatBRL, todayISO } from '../js/app.js';
import { getSalesAdminView, getExpenses } from '../js/db.js';

var currentReportType = 0;

export async function render(container) {
  container.innerHTML = buildLayout();
  setDefaultFilters();
  attachListeners();
  await loadReport();
}

function buildLayout() {
  return `
  <div class="page-header">
    <div><h1>Relatorios</h1></div>
    <div class="page-actions no-print">
      <button class="btn btn-secondary" onclick="printReport()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Imprimir
      </button>
    </div>
  </div>
  <div class="page-body">
    <div class="filter-bar no-print">
      <div class="filter-tabs" id="reportTabs">
        <button class="filter-tab active" data-range="today"  onclick="reportSetRange('today')">Hoje</button>
        <button class="filter-tab" data-range="week"          onclick="reportSetRange('week')">Semana</button>
        <button class="filter-tab" data-range="month"         onclick="reportSetRange('month')">Mes</button>
        <button class="filter-tab" data-range="year"          onclick="reportSetRange('year')">Ano</button>
        <button class="filter-tab" data-range="all"           onclick="reportSetRange('all')">Todos</button>
        <button class="filter-tab" data-range="custom"        onclick="reportSetRange('custom')">Personalizado</button>
      </div>
      <div class="filter-group" id="reportCustomRange" style="display:none">
        <label>De</label><input type="date" id="repDateFrom" />
        <label>Ate</label><input type="date" id="repDateTo" />
        <button class="btn btn-primary btn-sm" onclick="loadReport()">Aplicar</button>
      </div>
    </div>

    <!-- Tipo de relatorio -->
    <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-4)" id="reportTypeBar">
      ${['Todos','Valores Totais','Por Cliente','Por Sabor','Por Vendedor','Pagamentos','Despesas'].map(function(t,i){
        return '<button class="btn btn-' + (i===0?'primary':'secondary') + ' btn-sm" data-rtype="' + i + '" onclick="setReportType(' + i + ')">' + t + '</button>';
      }).join('')}
    </div>

    <div id="reportContent"><div class="page-loading"><div class="spinner dark"></div></div></div>
  </div>

  <div id="printHeader" class="print-header" style="display:none">
    <h1>Doces &amp; Empadas da Sarah</h1>
    <p id="printSubtitle">Relatorio</p>
    <p id="printPeriod"></p>
    <p>Gerado em: <span id="printDate"></span></p>
    <hr style="margin:12px 0;border:1px solid #e2e6ea"/>
  </div>`;
}

function setDefaultFilters() {
  var t = todayISO();
  if (document.getElementById('repDateFrom')) document.getElementById('repDateFrom').value = t;
  if (document.getElementById('repDateTo'))   document.getElementById('repDateTo').value   = t;
}

function attachListeners() {
  window.reportSetRange = function(range) {
    document.querySelectorAll('#reportTabs .filter-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.range === range);
    });
    var g = document.getElementById('reportCustomRange');
    var now = new Date();
    function fmt(d) { return d.toISOString().split('T')[0]; }
    var df = document.getElementById('repDateFrom');
    var dt = document.getElementById('repDateTo');
    g.style.display = 'none';
    if (range==='today')  { df.value = dt.value = fmt(now); loadReport(); }
    else if (range==='week')  { var s=new Date(now); s.setDate(now.getDate()-6); df.value=fmt(s); dt.value=fmt(now); loadReport(); }
    else if (range==='month') { df.value=fmt(now).slice(0,8)+'01'; dt.value=fmt(now); loadReport(); }
    else if (range==='year')  { df.value=fmt(now).slice(0,5)+'01-01'; dt.value=fmt(now); loadReport(); }
    else if (range==='all')   { df.value='2020-01-01'; dt.value=fmt(now); loadReport(); }
    else { g.style.display='flex'; }
  };
  window.setReportType = function(type) {
    currentReportType = type;
    document.querySelectorAll('[data-rtype]').forEach(function(b) {
      b.className = 'btn btn-' + (Number(b.dataset.rtype)===type?'primary':'secondary') + ' btn-sm';
    });
    loadReport();
  };
  window.loadReport    = loadReport;
  window.printReport   = printReport;
}

async function loadReport() {
  var dateFrom = document.getElementById('repDateFrom') ? document.getElementById('repDateFrom').value : undefined;
  var dateTo   = document.getElementById('repDateTo')   ? document.getElementById('repDateTo').value   : undefined;
  var wrap = document.getElementById('reportContent');
  wrap.innerHTML = '<div class="page-loading"><div class="spinner dark"></div></div>';
  try {
    var results = await Promise.all([
      getSalesAdminView({ dateFrom: dateFrom, dateTo: dateTo }),
      getExpenses({ dateFrom: dateFrom, dateTo: dateTo })
    ]);
    var sales = results[0], expenses = results[1];
    var types = currentReportType === 0 ? [1,2,3,4,5,6] : [currentReportType];
    var html = '';
    types.forEach(function(t) {
      if (t===1) html += renderTotals(sales, expenses);
      else if (t===2) html += renderByClient(sales);
      else if (t===3) html += renderByFlavor(sales);
      else if (t===4) html += renderBySeller(sales);
      else if (t===5) html += renderPayments(sales);
      else if (t===6) html += renderExpenses(expenses);
    });
    wrap.innerHTML = html || '<div class="empty-state"><p>Nenhum dado encontrado.</p></div>';
  } catch(err) {
    showToast('Erro ao gerar relatorio.', 'error');
    wrap.innerHTML = '<div class="empty-state"><p>Erro ao carregar dados.</p></div>';
    console.error(err);
  }
}

function card(label, value, color) {
  return '<div style="background:var(--surface-2);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);border-left:3px solid var(--brand-500)">' +
    '<div style="font-size:11px;color:var(--text-secondary);font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">' + label + '</div>' +
    '<div style="font-size:20px;font-weight:700;color:' + (color||'var(--text-primary)') + '">' + value + '</div>' +
  '</div>';
}

function sectionTitle(t) {
  return '<h3 style="font-size:14px;font-weight:700;color:var(--brand-800);padding-bottom:var(--space-3);border-bottom:2px solid var(--brand-100);margin-bottom:var(--space-4);margin-top:var(--space-6)">' + t + '</h3>';
}

function renderTotals(sales, expenses) {
  var tv = sales.reduce(function(a,s){return a+Number(s.amount||0);},0);
  var tr = sales.filter(function(s){return s.payment_status==='pago';}).reduce(function(a,s){return a+Number(s.amount||0);},0);
  var tp = tv - tr;
  var td = expenses.reduce(function(a,e){return a+Number(e.amount||0);},0);
  var re = tr - td;
  var bd = sales.reduce(function(a,s){return a+(s.quantity||0);},0);
  return '<div class="report-section">' + sectionTitle('Valores Totais') +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:var(--space-3)">' +
    card('Total Vendido', formatBRL(tv)) +
    card('Recebido', formatBRL(tr), 'var(--success)') +
    card('Pendente', formatBRL(tp), 'var(--warning)') +
    card('Despesas', formatBRL(td), 'var(--danger)') +
    card('Resultado', formatBRL(re), re>=0?'var(--success)':'var(--danger)') +
    card('Vendas', sales.length) +
    card('Bandejas', bd) +
    '</div></div>';
}

function renderByClient(sales) {
  var byClient = {};
  sales.forEach(function(s) {
    if (!byClient[s.client_name]) byClient[s.client_name] = {total:0,recebido:0,qty:0,bandejas:0};
    byClient[s.client_name].total    += Number(s.amount||0);
    if (s.payment_status==='pago') byClient[s.client_name].recebido += Number(s.amount||0);
    byClient[s.client_name].qty++;
    byClient[s.client_name].bandejas += (s.quantity||0);
  });
  var sorted = Object.entries(byClient).sort(function(a,b){return b[1].total-a[1].total;});

  var cards = sorted.map(function(e) {
    var name = e[0], d = e[1];
    var pend = d.total - d.recebido;
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-4);box-shadow:var(--shadow-sm);margin-bottom:var(--space-3)">' +
      '<div style="font-size:15px;font-weight:700;color:var(--brand-800);margin-bottom:var(--space-3)">' + name + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)">' +
        '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-tertiary)">Compras</div><div style="font-weight:700">' + d.qty + '</div></div>' +
        '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-tertiary)">Bandejas</div><div style="font-weight:700">' + d.bandejas + '</div></div>' +
        '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-tertiary)">Total</div><div style="font-weight:700">' + formatBRL(d.total) + '</div></div>' +
        '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-tertiary)">Pago</div><div style="font-weight:700;color:var(--success)">' + formatBRL(d.recebido) + '</div></div>' +
      '</div>' +
      (pend > 0 ? '<div style="margin-top:var(--space-3);padding:var(--space-2) var(--space-3);background:var(--warning-bg);border-radius:var(--radius-sm);font-size:13px;color:var(--warning);font-weight:700">Pendente: ' + formatBRL(pend) + '</div>' : '') +
    '</div>';
  }).join('');

  var pendSales = sales.filter(function(s){return s.payment_status==='pendente';});
  var pendList = pendSales.length ? sectionTitle('Clientes com Pendencias') +
    '<div style="display:flex;flex-direction:column;gap:var(--space-3)">' +
    pendSales.map(function(s) {
      return '<div style="background:var(--warning-bg);border:1px solid rgba(180,83,9,.15);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4)">' +
        '<div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:4px">' + s.client_name + '</div>' +
        '<div style="font-size:12px;color:var(--text-secondary)">' + formatDate(s.sale_date) + ' &bull; ' + s.flavor_name + ' &bull; ' + s.quantity + ' bdj. &bull; <strong>' + formatBRL(s.amount) + '</strong></div>' +
      '</div>';
    }).join('') + '</div>' : '';

  return '<div class="report-section">' + sectionTitle('Por Cliente') + cards + pendList + '</div>';
}

function renderByFlavor(sales) {
  var byFlavor = {};
  sales.forEach(function(s) {
    if (!byFlavor[s.flavor_name]) byFlavor[s.flavor_name] = {qty:0,count:0,total:0};
    byFlavor[s.flavor_name].qty   += (s.quantity||0);
    byFlavor[s.flavor_name].count++;
    byFlavor[s.flavor_name].total += Number(s.amount||0);
  });
  var sorted = Object.entries(byFlavor).sort(function(a,b){return b[1].qty-a[1].qty;});
  var maxQty  = sorted[0] ? sorted[0][1].qty : 1;
  var totalQty = sorted.reduce(function(a,e){return a+e[1].qty;},0);

  var bars = sorted.map(function(e) {
    var name=e[0], d=e[1];
    var pct = totalQty ? (d.qty/totalQty*100).toFixed(1) : '0';
    return '<div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)">' +
      '<div style="width:110px;font-size:12.5px;color:var(--text-primary);font-weight:600;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + name + '</div>' +
      '<div style="flex:1;height:10px;background:var(--surface-3);border-radius:5px;overflow:hidden">' +
        '<div style="height:100%;width:' + (d.qty/maxQty*100).toFixed(1) + '%;background:linear-gradient(90deg,var(--brand-600),var(--pink-400));border-radius:5px"></div>' +
      '</div>' +
      '<div style="font-size:12px;font-weight:700;width:70px;text-align:right;flex-shrink:0">' + d.qty + ' bdj. <span style="color:var(--text-tertiary);font-weight:400">(' + pct + '%)</span></div>' +
    '</div>';
  }).join('');

  return '<div class="report-section">' + sectionTitle('Por Sabor') + bars + '</div>';
}

function renderBySeller(sales) {
  var bySeller = {};
  sales.forEach(function(s) {
    if (!bySeller[s.seller_name]) bySeller[s.seller_name] = {total:0,recebido:0,qty:0,bandejas:0};
    bySeller[s.seller_name].total    += Number(s.amount||0);
    if (s.payment_status==='pago') bySeller[s.seller_name].recebido += Number(s.amount||0);
    bySeller[s.seller_name].qty++;
    bySeller[s.seller_name].bandejas += (s.quantity||0);
  });
  var sorted = Object.entries(bySeller).sort(function(a,b){return b[1].total-a[1].total;});

  var cards = sorted.map(function(e,i) {
    var name=e[0], d=e[1];
    var ticket = d.qty ? d.total/d.qty : 0;
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-4);box-shadow:var(--shadow-sm);margin-bottom:var(--space-3)">' +
      '<div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)">' +
        '<div style="width:28px;height:28px;border-radius:50%;background:var(--brand-100);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--brand-700);flex-shrink:0">' + (i+1) + '</div>' +
        '<div style="font-size:15px;font-weight:700;color:var(--brand-800)">' + name + '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)">' +
        '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-tertiary)">Vendas</div><div style="font-weight:700">' + d.qty + '</div></div>' +
        '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-tertiary)">Bandejas</div><div style="font-weight:700">' + d.bandejas + '</div></div>' +
        '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-tertiary)">Total Vendido</div><div style="font-weight:700">' + formatBRL(d.total) + '</div></div>' +
        '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-tertiary)">Ticket Medio</div><div style="font-weight:700">' + formatBRL(ticket) + '</div></div>' +
        '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-tertiary)">Recebido</div><div style="font-weight:700;color:var(--success)">' + formatBRL(d.recebido) + '</div></div>' +
        '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-tertiary)">Pendente</div><div style="font-weight:700;color:var(--warning)">' + formatBRL(d.total-d.recebido) + '</div></div>' +
      '</div>' +
    '</div>';
  }).join('');

  return '<div class="report-section">' + sectionTitle('Por Vendedor') + cards + '</div>';
}

function renderPayments(sales) {
  var paid    = sales.filter(function(s){return s.payment_status==='pago';});
  var pending = sales.filter(function(s){return s.payment_status==='pendente';});
  var sumPaid    = paid.reduce(function(a,s){return a+Number(s.amount||0);},0);
  var sumPending = pending.reduce(function(a,s){return a+Number(s.amount||0);},0);

  var pendRows = pending.map(function(s) {
    return '<div style="background:var(--warning-bg);border:1px solid rgba(180,83,9,.15);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-2)">' +
      '<div style="font-size:14px;font-weight:700;margin-bottom:2px">' + s.client_name + '</div>' +
      '<div style="font-size:12px;color:var(--text-secondary)">' + formatDate(s.sale_date) + ' &bull; ' + s.flavor_name + ' &bull; ' + s.quantity + ' bdj. &bull; <strong>' + formatBRL(s.amount) + '</strong></div>' +
    '</div>';
  }).join('');

  return '<div class="report-section">' + sectionTitle('Pagamentos') +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-5)">' +
    card('Confirmados', formatBRL(sumPaid) + ' (' + paid.length + ')', 'var(--success)') +
    card('Pendentes', formatBRL(sumPending) + ' (' + pending.length + ')', 'var(--warning)') +
    '</div>' +
    (pendRows ? sectionTitle('Detalhe das Pendencias') + pendRows : '') +
  '</div>';
}

function renderExpenses(expenses) {
  var byCat = {};
  expenses.forEach(function(e) { byCat[e.category] = (byCat[e.category]||0) + Number(e.amount||0); });
  var sorted = Object.entries(byCat).sort(function(a,b){return b[1]-a[1];});
  var total = expenses.reduce(function(a,e){return a+Number(e.amount||0);},0);

  var catCards = sorted.map(function(e) { return card(e[0], formatBRL(e[1])); }).join('');
  var expRows = expenses.map(function(e) {
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-2);display:flex;justify-content:space-between;align-items:center;gap:var(--space-3)">' +
      '<div>' +
        '<div style="font-size:13.5px;font-weight:600">' + e.description + '</div>' +
        '<div style="font-size:12px;color:var(--text-secondary)">' + formatDate(e.expense_date) + ' &bull; ' + e.category + (e.payment_method ? ' &bull; ' + e.payment_method : '') + '</div>' +
      '</div>' +
      '<div style="font-size:14px;font-weight:700;color:var(--danger);white-space:nowrap">' + formatBRL(e.amount) + '</div>' +
    '</div>';
  }).join('');

  return '<div class="report-section">' + sectionTitle('Despesas') +
    card('Total de Despesas', formatBRL(total), 'var(--danger)') +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--space-2);margin-top:var(--space-4);margin-bottom:var(--space-5)">' + catCards + '</div>' +
    (expRows ? sectionTitle('Lancamentos') + expRows : '') +
  '</div>';
}

function printReport() {
  var dFrom = document.getElementById('repDateFrom') ? document.getElementById('repDateFrom').value : '';
  var dTo   = document.getElementById('repDateTo')   ? document.getElementById('repDateTo').value   : '';
  var names = ['Todos os Relatorios','Valores Totais','Por Cliente','Por Sabor','Por Vendedor','Pagamentos','Despesas'];
  var hdr = document.getElementById('printHeader');
  hdr.style.display = 'block';
  document.getElementById('printSubtitle').textContent = names[currentReportType] || 'Relatorio';
  document.getElementById('printPeriod').textContent = 'Periodo: ' + formatDate(dFrom) + ' a ' + formatDate(dTo);
  document.getElementById('printDate').textContent = new Date().toLocaleString('pt-BR');
  window.print();
  hdr.style.display = 'none';
}

