/**
 * EMPADAS DA SARAH – CRM
 * js/db.js — Todas as queries ao Supabase centralizadas aqui
 * Importa sb de app.js (mesmo nível: js/)
 */
import { sb } from './app.js';

// ── CLIENTES ───────────────────────────────────────────────────
export async function getClients() {
  const { data, error } = await sb.from('clients')
    .select('*').eq('active', true).order('name');
  if (error) throw error;
  return data || [];
}

export async function createClient(payload) {
  const { data: { user } } = await sb.auth.getUser();
  const { data, error } = await sb.from('clients')
    .insert({ ...payload, created_by: user.id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateClient(id, payload) {
  const { data, error } = await sb.from('clients')
    .update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ── SABORES ────────────────────────────────────────────────────
export async function getFlavors() {
  const { data, error } = await sb.from('flavors')
    .select('*').eq('active', true).order('name');
  if (error) throw error;
  return data || [];
}

export async function createFlavor(name) {
  const { data: { user } } = await sb.auth.getUser();
  const { data, error } = await sb.from('flavors')
    .insert({ name: name.trim(), created_by: user.id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateFlavor(id, payload) {
  const { data, error } = await sb.from('flavors')
    .update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ── VENDAS (vendedor — sem amount) ────────────────────────────
export async function getSalesSellerView(filters = {}) {
  let q = sb.from('sales_seller_view').select('*')
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (filters.dateFrom) q = q.gte('sale_date', filters.dateFrom);
  if (filters.dateTo)   q = q.lte('sale_date', filters.dateTo);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// ── VENDAS (admin — com amount) ───────────────────────────────
export async function getSalesAdminView(filters = {}) {
  let q = sb.from('sales_admin_view').select('*')
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (filters.dateFrom)      q = q.gte('sale_date', filters.dateFrom);
  if (filters.dateTo)        q = q.lte('sale_date', filters.dateTo);
  if (filters.sellerId)      q = q.eq('seller_id', filters.sellerId);
  if (filters.paymentStatus) q = q.eq('payment_status', filters.paymentStatus);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createSale(payload) {
  const { data: { user } } = await sb.auth.getUser();
  const { data, error } = await sb.from('sales')
    .insert({ ...payload, seller_id: user.id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateSale(id, payload) {
  const { data, error } = await sb.from('sales')
    .update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function confirmPayment(saleId, paymentDate) {
  const { error } = await sb.rpc('confirm_payment', {
    p_sale_id: saleId, p_payment_date: paymentDate
  });
  if (error) throw error;
}

export async function revertPayment(saleId) {
  const { error } = await sb.rpc('revert_payment', { p_sale_id: saleId });
  if (error) throw error;
}

export async function deleteSaleLogic(saleId) {
  const { error } = await sb.rpc('delete_sale', { p_sale_id: saleId });
  if (error) throw error;
}

// ── DESPESAS ───────────────────────────────────────────────────
export async function getExpenses(filters = {}) {
  let q = sb.from('expenses').select('*').eq('active', true)
    .order('expense_date', { ascending: false });
  if (filters.dateFrom) q = q.gte('expense_date', filters.dateFrom);
  if (filters.dateTo)   q = q.lte('expense_date', filters.dateTo);
  if (filters.category) q = q.eq('category', filters.category);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createExpense(payload) {
  const { data: { user } } = await sb.auth.getUser();
  const { data, error } = await sb.from('expenses')
    .insert({ ...payload, created_by: user.id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateExpense(id, payload) {
  const { data, error } = await sb.from('expenses')
    .update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteExpenseLogic(expenseId) {
  const { error } = await sb.rpc('delete_expense', { p_expense_id: expenseId });
  if (error) throw error;
}

// ── PERFIS ─────────────────────────────────────────────────────
export async function getSellers() {
  const { data, error } = await sb.from('profiles')
    .select('*').eq('role', 'vendedor').eq('active', true).order('name');
  if (error) throw error;
  return data || [];
}

export async function getAllProfiles() {
  const { data, error } = await sb.from('profiles').select('*').order('name');
  if (error) throw error;
  return data || [];
}
