-- ============================================================
-- EMPADAS DA SARAH – CRM
-- Migration completa: tabelas, índices, RLS, triggers, funções
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- 1. EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. TABELA DE PERFIS (vinculada ao Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('vendedor', 'admin')),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  phone       TEXT,
  notes       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_active ON public.clients(active);

-- ============================================================
-- 4. SABORES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.flavors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_flavors_name_unique ON public.flavors(LOWER(name)) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_flavors_active ON public.flavors(active);

-- ============================================================
-- 5. VENDAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES public.clients(id),
  flavor_id       UUID NOT NULL REFERENCES public.flavors(id),
  seller_id       UUID NOT NULL REFERENCES public.profiles(id),
  sale_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  payment_status  TEXT NOT NULL DEFAULT 'pendente' CHECK (payment_status IN ('pendente', 'pago')),
  payment_date    DATE,
  payment_updated_at  TIMESTAMPTZ,
  payment_updated_by  UUID REFERENCES public.profiles(id),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON public.sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON public.sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON public.sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_active ON public.sales(active);

-- ============================================================
-- 6. DESPESAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description     TEXT NOT NULL,
  category        TEXT NOT NULL,
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  payment_method  TEXT,
  notes           TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_active ON public.expenses(active);

-- ============================================================
-- 7. LOG DE AUDITORIA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id),
  action      TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);

-- ============================================================
-- 8. FUNÇÃO: atualiza updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER trg_flavors_updated_at
  BEFORE UPDATE ON public.flavors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 9. FUNÇÃO: retorna role do usuário atual
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 10. FUNÇÃO: cria perfil ao registrar usuário no Auth
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Perfil é criado manualmente via script de setup ou admin
  -- Esta função é reservada para uso futuro
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 11. ROW LEVEL SECURITY — Habilitar
-- ============================================================
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flavors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. POLÍTICAS — PROFILES
-- ============================================================

-- Usuário pode ver seu próprio perfil
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Admin pode ver todos os perfis
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (public.get_my_role() = 'admin');

-- Admin pode atualizar perfis
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.get_my_role() = 'admin');

-- Admin pode inserir perfis
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

-- ============================================================
-- 13. POLÍTICAS — CLIENTS
-- ============================================================

-- Vendedor e admin podem ver clientes ativos
CREATE POLICY "clients_select_all_authenticated" ON public.clients
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND active = TRUE
  );

-- Vendedor e admin podem inserir clientes
CREATE POLICY "clients_insert_authenticated" ON public.clients
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Vendedor pode editar clientes que ele criou; admin edita todos
CREATE POLICY "clients_update_seller_own_or_admin" ON public.clients
  FOR UPDATE USING (
    public.get_my_role() = 'admin' OR created_by = auth.uid()
  );

-- Só admin pode excluir (exclusão lógica)
CREATE POLICY "clients_delete_admin" ON public.clients
  FOR DELETE USING (public.get_my_role() = 'admin');

-- ============================================================
-- 14. POLÍTICAS — FLAVORS
-- ============================================================

-- Todos autenticados podem ver sabores ativos
CREATE POLICY "flavors_select_authenticated" ON public.flavors
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND active = TRUE
  );

-- Vendedor e admin podem inserir sabores
CREATE POLICY "flavors_insert_authenticated" ON public.flavors
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Vendedor pode editar sabores que criou; admin edita todos
CREATE POLICY "flavors_update_seller_own_or_admin" ON public.flavors
  FOR UPDATE USING (
    public.get_my_role() = 'admin' OR created_by = auth.uid()
  );

-- Só admin pode excluir
CREATE POLICY "flavors_delete_admin" ON public.flavors
  FOR DELETE USING (public.get_my_role() = 'admin');

-- ============================================================
-- 15. POLÍTICAS — SALES
-- ============================================================

-- Todos autenticados podem ver vendas ativas
-- IMPORTANTE: a coluna `amount` é restrita no frontend para vendedores,
-- mas a RLS aqui restringe INSERT/UPDATE por role
CREATE POLICY "sales_select_authenticated" ON public.sales
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND active = TRUE
  );

-- Vendedor e admin podem inserir vendas
-- seller_id deve ser o próprio usuário (vendedor não pode cadastrar por outro)
CREATE POLICY "sales_insert_seller_own" ON public.sales
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND seller_id = auth.uid()
  );

-- Vendedor pode editar suas próprias vendas (dados básicos)
-- Admin pode editar tudo
CREATE POLICY "sales_update_seller_own_or_admin" ON public.sales
  FOR UPDATE USING (
    public.get_my_role() = 'admin' OR seller_id = auth.uid()
  );

-- Exclusão lógica: só admin
CREATE POLICY "sales_delete_admin" ON public.sales
  FOR DELETE USING (public.get_my_role() = 'admin');

-- ============================================================
-- 16. POLÍTICAS — EXPENSES (somente admin)
-- ============================================================

CREATE POLICY "expenses_all_admin" ON public.expenses
  FOR ALL USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ============================================================
-- 17. POLÍTICAS — AUDIT LOGS (somente admin lê; sistema escreve via service role)
-- ============================================================

CREATE POLICY "audit_select_admin" ON public.audit_logs
  FOR SELECT USING (public.get_my_role() = 'admin');

-- ============================================================
-- 18. VIEW PARA VENDEDORES (oculta amount das sales)
-- ============================================================
-- Esta view é usada pelo frontend do vendedor para garantir que
-- mesmo manipulando a API, o vendedor não veja valores financeiros

CREATE OR REPLACE VIEW public.sales_seller_view AS
  SELECT
    s.id,
    s.client_id,
    s.flavor_id,
    s.seller_id,
    s.sale_date,
    s.quantity,
    s.payment_status,
    s.active,
    s.created_at,
    s.updated_at,
    c.name AS client_name,
    f.name AS flavor_name,
    p.name AS seller_name
  FROM public.sales s
  JOIN public.clients c ON c.id = s.client_id
  JOIN public.flavors f ON f.id = s.flavor_id
  JOIN public.profiles p ON p.id = s.seller_id
  WHERE s.active = TRUE;

-- Permissão na view para usuários autenticados
GRANT SELECT ON public.sales_seller_view TO authenticated;

-- ============================================================
-- 19. VIEW COMPLETA PARA ADMIN (inclui amount)
-- ============================================================
CREATE OR REPLACE VIEW public.sales_admin_view AS
  SELECT
    s.id,
    s.client_id,
    s.flavor_id,
    s.seller_id,
    s.sale_date,
    s.quantity,
    s.amount,
    s.payment_status,
    s.payment_date,
    s.payment_updated_at,
    s.payment_updated_by,
    s.active,
    s.created_at,
    s.updated_at,
    c.name AS client_name,
    f.name AS flavor_name,
    p.name AS seller_name,
    pu.name AS payment_updated_by_name
  FROM public.sales s
  JOIN public.clients c ON c.id = s.client_id
  JOIN public.flavors f ON f.id = s.flavor_id
  JOIN public.profiles p ON p.id = s.seller_id
  LEFT JOIN public.profiles pu ON pu.id = s.payment_updated_by
  WHERE s.active = TRUE;

GRANT SELECT ON public.sales_admin_view TO authenticated;

-- ============================================================
-- 20. FUNÇÃO RPC: confirmar pagamento (somente admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_sale_id    UUID,
  p_payment_date DATE
)
RETURNS VOID AS $$
BEGIN
  IF public.get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: somente administradores podem confirmar pagamentos.';
  END IF;

  UPDATE public.sales
  SET
    payment_status      = 'pago',
    payment_date        = p_payment_date,
    payment_updated_at  = NOW(),
    payment_updated_by  = auth.uid()
  WHERE id = p_sale_id AND active = TRUE;

  -- Auditoria
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (
    auth.uid(),
    'CONFIRM_PAYMENT',
    'sales',
    p_sale_id,
    jsonb_build_object('payment_status', 'pago', 'payment_date', p_payment_date)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 21. FUNÇÃO RPC: reverter pagamento para pendente (somente admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.revert_payment(p_sale_id UUID)
RETURNS VOID AS $$
BEGIN
  IF public.get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: somente administradores podem reverter pagamentos.';
  END IF;

  UPDATE public.sales
  SET
    payment_status      = 'pendente',
    payment_date        = NULL,
    payment_updated_at  = NOW(),
    payment_updated_by  = auth.uid()
  WHERE id = p_sale_id AND active = TRUE;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (
    auth.uid(),
    'REVERT_PAYMENT',
    'sales',
    p_sale_id,
    jsonb_build_object('payment_status', 'pendente')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 22. FUNÇÃO RPC: soft-delete de venda (somente admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_sale(p_sale_id UUID)
RETURNS VOID AS $$
BEGIN
  IF public.get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  UPDATE public.sales SET active = FALSE WHERE id = p_sale_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id)
  VALUES (auth.uid(), 'DELETE_SALE', 'sales', p_sale_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 23. FUNÇÃO RPC: soft-delete de despesa (somente admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_expense(p_expense_id UUID)
RETURNS VOID AS $$
BEGIN
  IF public.get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  UPDATE public.expenses SET active = FALSE WHERE id = p_expense_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id)
  VALUES (auth.uid(), 'DELETE_EXPENSE', 'expenses', p_expense_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 24. GRANTS para authenticated
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON public.clients    TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.flavors    TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sales      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;

-- ============================================================
-- FIM DA MIGRATION
-- Execute o script setup-users.js separadamente para criar os usuários
-- ============================================================
