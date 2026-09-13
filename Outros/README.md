# Empadas da Sarah — CRM

Sistema de gestão comercial completo para controle de vendas, clientes, pagamentos, despesas e relatórios.

---

## Estrutura do Projeto

```
empadas-sarah-crm/
├── index.html              ← Página de login
├── app.html                ← Aplicação principal (pós-login)
├── styles.css              ← Design system completo
├── config.js               ← Credenciais públicas do Supabase (NÃO versionar)
├── migration.sql           ← Estrutura completa do banco de dados
├── setup-users.js          ← Script para criação dos usuários iniciais
├── package.json            ← Dependências do script de setup
├── .env.example            ← Modelo de variáveis de ambiente
├── .gitignore
├── README.md
└── js/
    ├── app.js              ← Bootstrap, roteador, auth guard, toast
    ├── db.js               ← Todas as queries ao Supabase
    ├── supabase-client.js  ← (legado — use db.js)
    └── pages/
        ├── dashboard-seller.js   ← Dashboard do vendedor (sem valores)
        ├── dashboard-admin.js    ← Dashboard administrativo completo
        ├── sales.js              ← Registro e listagem de vendas
        ├── clients.js            ← Cadastro de clientes
        ├── flavors.js            ← Cadastro de sabores
        ├── conciliation.js       ← Conciliação de pagamentos (admin)
        ├── reports.js            ← Relatórios financeiros (admin)
        ├── expenses.js           ← Controle de despesas (admin)
        ├── sellers.js            ← Desempenho dos vendedores (admin)
        └── settings.js           ← Configurações do sistema (admin)
```

---

## Pré-requisitos

- Conta no [Supabase](https://supabase.com) (gratuita)
- Node.js >= 16 (apenas para o script de criação de usuários)
- Repositório no GitHub (recomendado privado)

---

## Passo a Passo de Instalação

### 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Aguarde o projeto inicializar

### 2. Executar a migration do banco de dados

1. No painel do Supabase, acesse **SQL Editor**
2. Copie todo o conteúdo de `migration.sql`
3. Cole no SQL Editor e clique em **Run**
4. Verifique se todas as tabelas, views, funções e políticas foram criadas sem erros

### 3. Configurar as credenciais

1. No Supabase, vá em **Project Settings → API**
2. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (apenas para o script de setup)

3. Edite o arquivo `config.js` com as credenciais públicas:

```js
window.__APP_CONFIG__ = {
  SUPABASE_URL:      'https://SEU_PROJETO.supabase.co',
  SUPABASE_ANON_KEY: 'SUA_ANON_KEY_AQUI'
};
```

4. Crie o arquivo `.env` (para o script Node):

```env
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
```

> **NUNCA** versione `.env` ou `config.js` no GitHub.  
> O `.gitignore` já está configurado para ignorar o `.env`.  
> Adicione também `config.js` ao `.gitignore` se preferir.

### 4. Criar os usuários iniciais

```bash
npm install
node setup-users.js
```

Isso cria os três usuários no Supabase Auth e seus perfis na tabela `profiles`:

| Nome | E-mail | Senha inicial | Perfil |
|------|--------|---------------|--------|
| Maycon Morais | maycon.morais0777@gmail.com | Maycon2021. | vendedor |
| Osvalda Oliveira | oswaldaoliveira@gmail.com | Osvalda1985. | vendedor |
| Administração | adminsarah@gmail.com | Empadas@2026. | admin |

> Execute este script **apenas uma vez**.  
> Após o primeiro acesso, cada usuário deve alterar sua senha em Configurações.

### 5. Deploy no GitHub Pages

1. Faça push do projeto para um repositório GitHub
2. Vá em **Settings → Pages** do repositório
3. Selecione a branch `main` e a pasta raiz `/`
4. O sistema estará disponível em `https://SEU-USUARIO.github.io/REPOSITORIO/`

> **Importante:** O `config.js` com as credenciais **não deve** estar no repositório público.  
> Para repositórios públicos, use GitHub Secrets + uma GitHub Action para injetar o `config.js` no deploy,  
> ou mantenha o repositório **privado**.

---

## Funcionalidades

### Vendedor
- Dashboard operacional (quantidade de vendas, bandejas, clientes — **sem valores financeiros**)
- Registro de vendas com autocomplete de cliente e sabor
- Cadastro e edição de clientes
- Cadastro e edição de sabores
- Filtros de período no dashboard e na listagem de vendas

### Administrador
- Dashboard financeiro completo (vendas, recebimentos, pendências, despesas, resultado)
- Gráficos: evolução de vendas, vendas por vendedor, por sabor, status de pagamentos
- Conciliação de pagamentos (confirmar/reverter pagamento, registrar data)
- Relatórios completos: totais, por cliente, por sabor, por vendedor, pagamentos, despesas
- Impressão de relatórios formatada para A4
- Controle de despesas com categorias
- Visão de desempenho dos vendedores
- Configurações (alteração de senha)

---

## Segurança

- Autenticação via **Supabase Auth** (senhas com hash bcrypt, nunca armazenadas em texto puro)
- **Row Level Security (RLS)** ativo em todas as tabelas — as restrições de acesso existem no banco, não apenas no frontend
- Vendedor **não consegue** acessar valores financeiros mesmo via requisição direta à API
- Confirmação de pagamento é feita via **função RPC com SECURITY DEFINER** — vendedor não pode chamar
- Log de auditoria para alterações de pagamento e exclusões
- Chave `service_role` nunca exposta no frontend

---

## Estrutura do Banco de Dados

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfis dos usuários (vinculados ao Supabase Auth) |
| `clients` | Clientes cadastrados |
| `flavors` | Sabores/produtos |
| `sales` | Vendas registradas |
| `expenses` | Despesas da empresa |
| `audit_logs` | Log de alterações importantes |

### Views
| View | Acesso | Descrição |
|------|--------|-----------|
| `sales_seller_view` | Todos autenticados | Vendas **sem** o campo `amount` |
| `sales_admin_view` | Todos autenticados (filtro no frontend) | Vendas **com** todos os campos |

---

## Suporte e Manutenção

Para adicionar novos vendedores ou administradores no futuro:
1. Crie o usuário manualmente no painel **Supabase → Authentication → Users**
2. Insira o perfil na tabela `profiles` com o `id` do usuário criado e o `role` desejado

Nenhuma alteração no código-fonte é necessária.
