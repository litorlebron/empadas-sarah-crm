/**
 * EMPADAS DA SARAH – CRM
 * Configuracoes — somente admin
 */
import { showToast } from '../js/app.js';
import { sb } from '../js/app.js';

export async function render(container) {
  container.innerHTML = buildLayout();
  attachListeners();
}

function buildLayout() {
  return `
  <div class="page-header">
    <div><h1>Configuracoes</h1></div>
  </div>
  <div class="page-body">
    <div style="max-width:520px">

      <!-- Alterar senha -->
      <div class="card" style="margin-bottom:var(--space-5)">
        <div class="card-header">
          <div>
            <div class="card-title">Alterar Senha</div>
            <div class="card-subtitle">Recomendamos alterar a senha inicial no primeiro acesso.</div>
          </div>
        </div>
        <div class="field">
          <label>Nova Senha</label>
          <input type="password" id="newPassword" placeholder="Minimo 8 caracteres" />
        </div>
        <div class="field">
          <label>Confirmar Nova Senha</label>
          <input type="password" id="confirmPassword" placeholder="Repita a nova senha" />
        </div>
        <p id="pwdError" style="color:var(--danger);font-size:13px;display:none;margin-bottom:var(--space-3)"></p>
        <button class="btn btn-primary" id="savePwdBtn" onclick="savePassword()">Alterar Senha</button>
      </div>

      <!-- Informacoes do sistema -->
      <div class="card">
        <div class="card-header"><div class="card-title">Sobre o Sistema</div></div>
        <div style="font-size:13.5px;color:var(--text-secondary);line-height:2">
          <div><strong>Sistema:</strong> Empadas da Sarah — CRM</div>
          <div><strong>Versao:</strong> 1.0.0</div>
          <div><strong>Backend:</strong> Supabase (PostgreSQL)</div>
          <div><strong>Seguranca:</strong> Row Level Security (RLS) ativo</div>
        </div>
      </div>

    </div>
  </div>`;
}

function attachListeners() {
  window.savePassword = savePassword;
}

async function savePassword() {
  const errEl   = document.getElementById('pwdError');
  const newPwd  = document.getElementById('newPassword').value;
  const confPwd = document.getElementById('confirmPassword').value;
  errEl.style.display = 'none';

  if (!newPwd || newPwd.length < 8) {
    errEl.textContent = 'A senha deve ter no minimo 8 caracteres.';
    errEl.style.display = 'block';
    return;
  }
  if (newPwd !== confPwd) {
    errEl.textContent = 'As senhas nao coincidem.';
    errEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('savePwdBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Salvando...';

  try {
    const { error } = await sb.auth.updateUser({ password: newPwd });
    if (error) throw error;
    showToast('Senha alterada com sucesso.', 'success');
    document.getElementById('newPassword').value    = '';
    document.getElementById('confirmPassword').value = '';
  } catch (err) {
    errEl.textContent = 'Nao foi possivel alterar a senha. Tente novamente.';
    errEl.style.display = 'block';
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Alterar Senha';
  }
}
