/**
 * EMPADAS DA SARAH – CRM
 * Vendedores — somente admin
 */
import { showToast, formatDate, formatBRL, todayISO } from '../js/app.js';
import { getAllProfiles, getSalesAdminView } from '../js/db.js';

export async function render(container) {
  container.innerHTML = buildLayout();
  await loadSellers();
}

function buildLayout() {
  return `
  <div class="page-header">
    <div><h1>Vendedores</h1></div>
  </div>
  <div class="page-body">
    <div id="sellersContent">
      <div class="page-loading"><div class="spinner dark"></div></div>
    </div>
  </div>`;
}

async function loadSellers() {
  const wrap = document.getElementById('sellersContent');
  try {
    const [profiles, sales] = await Promise.all([
      getAllProfiles(),
      getSalesAdminView({})
    ]);

    const sellers = profiles.filter(p => p.role === 'vendedor');

    if (!sellers.length) {
      wrap.innerHTML = `<div class="empty-state"><p>Nenhum vendedor cadastrado.</p></div>`;
      return;
    }

    let html = '';

    // Cards de desempenho por vendedor
    html += `<div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));margin-bottom:var(--space-6)">`;
    sellers.forEach(seller => {
      const sellerSales  = sales.filter(s => s.seller_id === seller.id);
      const total        = sellerSales.reduce((a, s) => a + Number(s.amount || 0), 0);
      const recebido     = sellerSales.filter(s => s.payment_status === 'pago').reduce((a, s) => a + Number(s.amount || 0), 0);
      const pendente     = total - recebido;
      const bandejas     = sellerSales.reduce((a, s) => a + (s.quantity || 0), 0);
      const ticket       = sellerSales.length ? total / sellerSales.length : 0;

      html += `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">${seller.name}</div>
              <div class="card-subtitle"><span class="badge badge-seller">Vendedor</span>&nbsp;${seller.active ? '' : '<span class="badge badge-pending">Inativo</span>'}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
            <div><div class="kpi-label" style="font-size:11px">Total de Vendas</div><div style="font-size:20px;font-weight:700">${sellerSales.length}</div></div>
            <div><div class="kpi-label" style="font-size:11px">Bandejas</div><div style="font-size:20px;font-weight:700">${bandejas}</div></div>
            <div><div class="kpi-label" style="font-size:11px">Total Vendido</div><div style="font-size:16px;font-weight:700">${formatBRL(total)}</div></div>
            <div><div class="kpi-label" style="font-size:11px">Recebido</div><div style="font-size:16px;font-weight:700;color:var(--success)">${formatBRL(recebido)}</div></div>
            <div><div class="kpi-label" style="font-size:11px">Pendente</div><div style="font-size:16px;font-weight:700;color:var(--warning)">${formatBRL(pendente)}</div></div>
            <div><div class="kpi-label" style="font-size:11px">Ticket Medio</div><div style="font-size:16px;font-weight:700">${formatBRL(ticket)}</div></div>
          </div>
        </div>`;
    });
    html += `</div>`;

    // Tabela completa de vendedores
    html += `
      <div class="card">
        <div class="card-header"><div class="card-title">Todos os Usuarios</div></div>
        <div class="table-wrapper" style="border:none;box-shadow:none">
          <table>
            <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Cadastro</th></tr></thead>
            <tbody>
              ${profiles.map(p => `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td style="color:var(--text-secondary);font-size:13px">${p.id}</td>
                  <td><span class="badge badge-${p.role === 'admin' ? 'admin' : 'seller'}">${p.role === 'admin' ? 'Administrador' : 'Vendedor'}</span></td>
                  <td><span class="badge ${p.active ? 'badge-paid' : 'badge-pending'}">${p.active ? 'Ativo' : 'Inativo'}</span></td>
                  <td>${formatDate(p.created_at?.split('T')[0])}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    wrap.innerHTML = html;
  } catch (err) {
    showToast('Erro ao carregar vendedores.', 'error');
    wrap.innerHTML = `<div class="empty-state"><p>Erro ao carregar dados.</p></div>`;
    console.error(err);
  }
}
