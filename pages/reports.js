/**
 * EMPADAS DA SARAH – CRM
 * Relatorios — relatório gerencial compacto (tela + impressão A4)
 */
import { showToast, formatDate, formatBRL, todayISO } from '../js/app.js';
import { getSalesAdminView, getExpenses } from '../js/db.js';

var currentReportType = 0;
var lastLoaded = { from: '', to: '', type: 0 };
var printHooksBound = false;

var REPORT_NAMES = ['Todos os Relatórios','Valores Totais','Por Cliente','Por Sabor','Por Vendedor','Pagamentos','Despesas'];

export async function render(container) {
  container.innerHTML = buildLayout();
  setDefaultFilters();
  attachListeners();
  bindPrintHooks();
  await loadReport();
}

function buildLayout() {
  return `
  <div class="rpt-root">
  <div class="rpt-print-header">
    <div class="rpt-ph-left">
      <div class="rpt-ph-brand">Doces &amp; Empadas da Sarah</div>
      <div class="rpt-ph-title">Relatório Gerencial</div>
    </div>
    <div class="rpt-ph-right">
      <div class="rpt-ph-type" id="printSubtitle"></div>
      <div id="printPeriod"></div>
    </div>
  </div>

  <div class="page-header no-print">
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
    <div class="no-print" style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-4)" id="reportTypeBar">
      ${['Todos','Valores Totais','Por Cliente','Por Sabor','Por Vendedor','Pagamentos','Despesas'].map(function(t,i){
        return '<button class="btn btn-' + (i===0?'primary':'secondary') + ' btn-sm" data-rtype="' + i + '" onclick="setReportType(' + i + ')">' + t + '</button>';
      }).join('')}
    </div>

    <div id="reportContent"><div class="page-loading"><div class="spinner dark"></div></div></div>
  </div>

  <div class="rpt-footer-inline">
    <span>Doces &amp; Empadas da Sarah — CRM</span>
    <span id="rptFootPeriod"></span>
    <span id="rptFootDate"></span>
  </div>
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
    else if (range==='year')  { df.value=fmt(now).slice(0,5)+'01-01'; dt.value=fmt(now).slice(0,5)+'12-31'; loadReport(); }
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
    lastLoaded = { from: dateFrom, to: dateTo, type: currentReportType };
    var types = currentReportType === 0 ? [1,2,3,4,5,6] : [currentReportType];
    var html = '';
    types.forEach(function(t) {
      if (t===1) html += renderTotals(sales, expenses);
      else if (t===2) html += renderByClient(sales, currentReportType === 0);
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

// ── Helpers de apresentação ────────────────────────────────────
function esc(v) {
  return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function sectionTitle(t) { return '<h3 class="rpt-h">' + t + '</h3>'; }
function section(title, body, keep) {
  return '<section class="rpt-section' + (keep ? ' rpt-keep' : '') + '">' + sectionTitle(title) + body + '</section>';
}

// Indicador compacto. tone: '' | 'pos' | 'pend' | 'neg'
function kpi(label, value, tone) {
  return '<div class="rpt-kpi' + (tone ? ' ' + tone : '') + '"><span class="rpt-kpi-l">' + label + '</span><span class="rpt-kpi-v">' + value + '</span></div>';
}
function kpis(html, cols) {
  return '<div class="rpt-kpis" style="--rpt-cols:' + cols + '">' + html + '</div>';
}

// headers: [{t:'Cliente'}, {t:'Total', n:true}]  rows: array de arrays de HTML (ou {cells, total:true})
function tbl(headers, rows) {
  var th = headers.map(function(h) { return '<th' + (h.n ? ' class="n"' : '') + '>' + h.t + '</th>'; }).join('');
  var tr = rows.map(function(r) {
    var cells = r.cells || r;
    return '<tr' + (r.total ? ' class="rpt-total"' : '') + '>' + cells.map(function(c, i) {
      return '<td' + (headers[i] && headers[i].n ? ' class="n"' : '') + '>' + c + '</td>';
    }).join('') + '</tr>';
  }).join('');
  return '<div class="rpt-scroll"><table class="rpt-table"><thead><tr>' + th + '</tr></thead><tbody>' + tr + '</tbody></table></div>';
}

function sumBy(list, fn) { return list.reduce(function(a, x) { return a + fn(x); }, 0); }

// ── Seções ─────────────────────────────────────────────────────
function renderTotals(sales, expenses) {
  var tv = sales.reduce(function(a,s){return a+Number(s.amount||0);},0);
  var tr = sales.filter(function(s){return s.payment_status==='pago';}).reduce(function(a,s){return a+Number(s.amount||0);},0);
  var tp = tv - tr;
  var td = expenses.reduce(function(a,e){return a+Number(e.amount||0);},0);
  var re = tr - td;
  var bd = sales.reduce(function(a,s){return a+(s.quantity||0);},0);
  return section('Valores Totais', kpis(
    kpi('Total Vendido', formatBRL(tv)) +
    kpi('Recebido', formatBRL(tr), 'pos') +
    kpi('Pendente', formatBRL(tp), 'pend') +
    kpi('Despesas', formatBRL(td), 'neg') +
    kpi('Resultado', formatBRL(re), re>=0?'pos':'neg') +
    kpi('Vendas', countOrders(sales)) +
    kpi('Bandejas', bd), 7), true);
}

function pendingTable(pendSales) {
  var total = sumBy(pendSales, function(s){ return Number(s.amount||0); });
  var rows = pendSales.map(function(s) {
    return [esc(s.client_name), formatDate(s.sale_date), esc(s.flavor_name), s.quantity + ' bdj.', formatBRL(s.amount)];
  });
  rows.push({ total: true, cells: ['TOTAL PENDENTE (' + pendSales.length + ')', '', '', sumBy(pendSales, function(s){return s.quantity||0;}) + ' bdj.', formatBRL(total)] });
  return tbl([{t:'Cliente'},{t:'Data'},{t:'Produto'},{t:'Qtd.',n:true},{t:'Valor',n:true}], rows);
}

function renderByClient(sales, skipPending) {
  var byClient = {};
  sales.forEach(function(s) {
    if (!byClient[s.client_name]) byClient[s.client_name] = {total:0,recebido:0,qty:0,bandejas:0,_o:{}};
    byClient[s.client_name].total    += Number(s.amount||0);
    if (s.payment_status==='pago') byClient[s.client_name].recebido += Number(s.amount||0);
    if (!byClient[s.client_name]._o[s.order_id || s.id]) { byClient[s.client_name]._o[s.order_id || s.id] = 1; byClient[s.client_name].qty++; }
    byClient[s.client_name].bandejas += (s.quantity||0);
  });
  var sorted = Object.entries(byClient).sort(function(a,b){return b[1].total-a[1].total;});

  var rows = sorted.map(function(e) {
    var d = e[1], pend = d.total - d.recebido;
    return [esc(e[0]), d.qty, d.bandejas, formatBRL(d.total),
      '<span class="pos">' + formatBRL(d.recebido) + '</span>',
      pend > 0 ? '<span class="pend">' + formatBRL(pend) + '</span>' : '—'];
  });
  var T = {
    qty: sumBy(sorted, function(e){return e[1].qty;}), bdj: sumBy(sorted, function(e){return e[1].bandejas;}),
    total: sumBy(sorted, function(e){return e[1].total;}), rec: sumBy(sorted, function(e){return e[1].recebido;})
  };
  rows.push({ total: true, cells: ['TOTAL GERAL', T.qty, T.bdj, formatBRL(T.total),
    '<span class="pos">' + formatBRL(T.rec) + '</span>', '<span class="pend">' + formatBRL(T.total - T.rec) + '</span>'] });

  var main = section('Por Cliente',
    tbl([{t:'Cliente'},{t:'Compras',n:true},{t:'Bandejas',n:true},{t:'Total',n:true},{t:'Pago',n:true},{t:'Pendente',n:true}], rows),
    rows.length <= 12);

  // Em "Todos" as pendências já aparecem na seção Pagamentos (evita repetir a mesma lista)
  var pendSales = sales.filter(function(s){return s.payment_status==='pendente';});
  var pendList = (!skipPending && pendSales.length)
    ? section('Clientes com Pendências', pendingTable(pendSales), pendSales.length <= 12) : '';
  return main + pendList;
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

  var rows = sorted.map(function(e) {
    var d = e[1];
    var pct = totalQty ? (d.qty/totalQty*100).toFixed(1) : '0.0';
    var bar = '<div class="rpt-bar"><div class="rpt-bar-fill" style="width:' + (maxQty ? (d.qty/maxQty*100).toFixed(1) : 0) + '%"></div></div>' +
              '<span class="rpt-pct">' + pct.replace('.', ',') + '%</span>';
    return [esc(e[0]), d.qty, '<div class="rpt-share">' + bar + '</div>', d.count, formatBRL(d.total)];
  });
  rows.push({ total: true, cells: ['TOTAL GERAL', totalQty, '<span class="rpt-pct">100%</span>',
    sumBy(sorted, function(e){return e[1].count;}), formatBRL(sumBy(sorted, function(e){return e[1].total;}))] });

  return section('Por Sabor',
    tbl([{t:'Sabor'},{t:'Bandejas',n:true},{t:'Participação'},{t:'Vendas',n:true},{t:'Total',n:true}], rows),
    rows.length <= 14);
}

function renderBySeller(sales) {
  var bySeller = {};
  sales.forEach(function(s) {
    if (!bySeller[s.seller_name]) bySeller[s.seller_name] = {total:0,recebido:0,qty:0,bandejas:0,_o:{}};
    bySeller[s.seller_name].total    += Number(s.amount||0);
    if (s.payment_status==='pago') bySeller[s.seller_name].recebido += Number(s.amount||0);
    if (!bySeller[s.seller_name]._o[s.order_id || s.id]) { bySeller[s.seller_name]._o[s.order_id || s.id] = 1; bySeller[s.seller_name].qty++; }
    bySeller[s.seller_name].bandejas += (s.quantity||0);
  });
  var sorted = Object.entries(bySeller).sort(function(a,b){return b[1].total-a[1].total;});

  var rows = sorted.map(function(e) {
    var d = e[1];
    var ticket = d.qty ? d.total/d.qty : 0;
    return [esc(e[0]), d.qty, d.bandejas, formatBRL(d.total),
      '<span class="pos">' + formatBRL(d.recebido) + '</span>',
      '<span class="pend">' + formatBRL(d.total - d.recebido) + '</span>', formatBRL(ticket)];
  });
  var tQty = sumBy(sorted, function(e){return e[1].qty;}),
      tBdj = sumBy(sorted, function(e){return e[1].bandejas;}),
      tTot = sumBy(sorted, function(e){return e[1].total;}),
      tRec = sumBy(sorted, function(e){return e[1].recebido;});
  rows.push({ total: true, cells: ['TOTAL GERAL', tQty, tBdj, formatBRL(tTot),
    '<span class="pos">' + formatBRL(tRec) + '</span>', '<span class="pend">' + formatBRL(tTot - tRec) + '</span>',
    formatBRL(tQty ? tTot/tQty : 0)] });

  return section('Por Vendedor',
    tbl([{t:'Vendedor'},{t:'Vendas',n:true},{t:'Bandejas',n:true},{t:'Total Vendido',n:true},{t:'Recebido',n:true},{t:'Pendente',n:true},{t:'Ticket Médio',n:true}], rows),
    true);
}

function renderPayments(sales) {
  var paid    = sales.filter(function(s){return s.payment_status==='pago';});
  var pending = sales.filter(function(s){return s.payment_status==='pendente';});
  var sumPaid    = paid.reduce(function(a,s){return a+Number(s.amount||0);},0);
  var sumPending = pending.reduce(function(a,s){return a+Number(s.amount||0);},0);

  var summary = kpis(
    kpi('Confirmados', formatBRL(sumPaid) + ' <small>(' + paid.length + ')</small>', 'pos') +
    kpi('Pendentes', formatBRL(sumPending) + ' <small>(' + pending.length + ')</small>', 'pend'), 2);

  var detail = pending.length
    ? '<div class="rpt-sub">Detalhe das Pendências</div>' + pendingTable(pending)
    : '';
  return section('Pagamentos', summary + detail, pending.length <= 12);
}

function renderExpenses(expenses) {
  var byCat = {};
  expenses.forEach(function(e) { byCat[e.category] = (byCat[e.category]||0) + Number(e.amount||0); });
  var sorted = Object.entries(byCat).sort(function(a,b){return b[1]-a[1];});
  var total = expenses.reduce(function(a,e){return a+Number(e.amount||0);},0);

  // Total + categorias em uma faixa compacta de indicadores
  var strip = kpi('Total de Despesas', formatBRL(total), 'neg') +
    sorted.map(function(e) { return kpi(esc(e[0]), formatBRL(e[1])); }).join('');

  var expRows = expenses.map(function(e) {
    return [formatDate(e.expense_date), esc(e.description), esc(e.category), esc(e.payment_method || '—'), formatBRL(e.amount)];
  });

  return section('Despesas',
    kpis(strip, Math.min(sorted.length + 1, 5)) +
    (expRows.length ? '<div class="rpt-sub">Lançamentos</div>' +
      tbl([{t:'Data'},{t:'Descrição'},{t:'Categoria'},{t:'Forma Pgto.'},{t:'Valor',n:true}], expRows) : ''),
    expenses.length <= 8);
}

// ── Impressão ──────────────────────────────────────────────────
function periodText() {
  return 'Período: ' + formatDate(lastLoaded.from) + ' a ' + formatDate(lastLoaded.to);
}

// O rodapé com "Página X de Y" usa caixas de margem do @page (Chrome/Edge 131+).
// Em outros navegadores aparece um rodapé simples no fim do relatório.
function marginBoxesSupported() {
  var m = /(?:Chrome|Chromium|Edg)\/(\d+)/.exec(navigator.userAgent);
  return !!m && Number(m[1]) >= 131;
}

function fillPrintTexts() {
  var gen = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  var st = document.getElementById('printSubtitle');
  var pp = document.getElementById('printPeriod');
  if (st) st.textContent = REPORT_NAMES[lastLoaded.type] || 'Relatório';
  if (pp) pp.textContent = periodText();
  var fp = document.getElementById('rptFootPeriod');
  var fd = document.getElementById('rptFootDate');
  if (fp) fp.textContent = periodText();
  if (fd) fd.textContent = 'Gerado em: ' + gen;
  return gen;
}

function onBeforePrint() {
  if (!document.querySelector('.rpt-root')) return;
  var gen = fillPrintTexts();
  var mb = marginBoxesSupported();
  document.documentElement.classList.toggle('rpt-mbox', mb);
  if (!mb) return;
  var old = document.getElementById('rptPageStyle');
  if (old) old.remove();
  var st = document.createElement('style');
  st.id = 'rptPageStyle';
  var box = 'font-family:"Segoe UI",Arial,sans-serif;font-size:7.5pt;color:#7a5560;padding-top:1.6mm;border-top:0.5pt solid #e8c4d0;';
  st.textContent = '@page report{' +
    '@bottom-left{content:"Doces & Empadas da Sarah — CRM   |   ' + periodText() + '   |   Gerado em: ' + gen + '";text-align:left;vertical-align:top;' + box + '}' +
    '@bottom-right{content:"Página " counter(page) " de " counter(pages);text-align:right;vertical-align:top;' + box + '}' +
  '}';
  document.head.appendChild(st);
}

function onAfterPrint() {
  var st = document.getElementById('rptPageStyle');
  if (st) st.remove();
}

function bindPrintHooks() {
  if (printHooksBound) return;
  printHooksBound = true;
  window.addEventListener('beforeprint', onBeforePrint);
  window.addEventListener('afterprint', onAfterPrint);
}

function printReport() {
  window.print();   // textos e rodapé são preenchidos em onBeforePrint (também vale para Ctrl+P)
}

// Conta vendas (pedidos): linhas com o mesmo order_id contam como 1.
// Vendas antigas, sem order_id, contam cada uma como 1.
function countOrders(sales) {
  var seen = {};
  sales.forEach(function(s) { seen[s.order_id || s.id] = true; });
  return Object.keys(seen).length;
}
