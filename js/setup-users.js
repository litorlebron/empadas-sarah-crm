/**
 * EMPADAS DA SARAH – CRM
 * Script de criação dos usuários iniciais
 *
 * Pré-requisitos:
 *   node >= 16
 *   npm install @supabase/supabase-js dotenv
 *
 * Execute: node setup-users.js
 *
 * ATENÇÃO: Execute este script APENAS UMA VEZ, após rodar migration.sql
 * Guarde as credenciais com segurança e não as versione no git.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl          = process.env.SUPABASE_URL;
const supabaseServiceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERRO: Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env');
  process.exit(1);
}

// Usa a Service Role Key para criação de usuários no Auth
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const users = [
  {
    email:    'maycon.morais0777@gmail.com',
    password: 'Maycon2021.',
    name:     'Maycon Morais',
    role:     'vendedor'
  },
  {
    email:    'oswaldaoliveira@gmail.com',
    password: 'Osvalda1985.',
    name:     'Osvalda Oliveira',
    role:     'vendedor'
  },
  {
    email:    'adminsarah@gmail.com',
    password: 'Empadas@2026.',
    name:     'Administração',
    role:     'admin'
  }
];

async function createUser(userData) {
  console.log(`\nCriando usuário: ${userData.email}`);

  // 1. Cria o usuário no Auth do Supabase
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email:             userData.email,
    password:          userData.password,
    email_confirm:     true
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log(`  -> Usuário já existe no Auth: ${userData.email}`);
      // Tenta buscar o ID existente
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existingUser = listData?.users?.find(u => u.email === userData.email);
      if (existingUser) {
        return existingUser.id;
      }
    }
    console.error(`  -> Erro ao criar no Auth: ${authError.message}`);
    return null;
  }

  const userId = authData.user.id;
  console.log(`  -> Auth criado. ID: ${userId}`);

  // 2. Cria o perfil na tabela profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id:   userId,
      name: userData.name,
      role: userData.role
    }, { onConflict: 'id' });

  if (profileError) {
    console.error(`  -> Erro ao criar perfil: ${profileError.message}`);
    return null;
  }

  console.log(`  -> Perfil criado: ${userData.name} (${userData.role})`);
  return userId;
}

async function main() {
  console.log('==============================================');
  console.log('  EMPADAS DA SARAH – Setup de Usuários');
  console.log('==============================================');

  for (const user of users) {
    await createUser(user);
  }

  console.log('\n==============================================');
  console.log('  Setup concluído.');
  console.log('  IMPORTANTE: As senhas iniciais foram definidas.');
  console.log('  Os usuários devem alterar suas senhas no primeiro acesso.');
  console.log('==============================================\n');
}

main().catch(err => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
