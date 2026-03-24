registerPage('configuracoes', async function () {

  // ═══════════ TABS ═══════════
  const tabs = document.querySelectorAll('.cfg-tab');
  const panels = document.querySelectorAll('.cfg-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.style.color = 'var(--text-muted)'; t.style.borderBottomColor = 'transparent'; });
      tab.classList.add('active');
      tab.style.color = 'var(--primary)';
      tab.style.borderBottomColor = 'var(--primary)';
      panels.forEach(p => p.classList.add('hidden'));
      document.getElementById('panel' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)).classList.remove('hidden');
    });
    // Init active tab style
    if (tab.classList.contains('active')) { tab.style.color = 'var(--primary)'; tab.style.borderBottomColor = 'var(--primary)'; }
  });

  // ═══════════ TAB: CLÍNICA ═══════════
  const cfgData = await apiFetch('/configuracoes');
  if (cfgData && cfgData.configuracoes) {
    const c = cfgData.configuracoes;
    // O clinica_nome é populado pelo /auth/me preferencialmente, mas whatsapp vem daqui
    document.getElementById('cfgWhatsApp').value = c.whatsapp_numero || '';
    if (c.horario_abertura) document.getElementById('cfgAbertura').value = (typeof c.horario_abertura === 'string' ? c.horario_abertura : '').substring(0, 5);
    if (c.horario_fechamento) document.getElementById('cfgFechamento').value = (typeof c.horario_fechamento === 'string' ? c.horario_fechamento : '').substring(0, 5);
    if (c.duracao_consulta) document.getElementById('cfgDuracao').value = c.duracao_consulta;

    // Days toggles
    const dias = c.dias_funcionamento || ['Segunda','Terca','Quarta','Quinta','Sexta'];
    document.querySelectorAll('.day-toggle').forEach(dt => {
      dt.classList.toggle('active', dias.includes(dt.dataset.dia));
    });
  }

  // Days toggle click
  document.querySelectorAll('.day-toggle').forEach(dt => {
    dt.addEventListener('click', () => dt.classList.toggle('active'));
  });

  document.getElementById('cfgSaveBtnClinica').addEventListener('click', async () => {
    const btn = document.getElementById('cfgSaveBtnClinica');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    const diasSelecionados = [...document.querySelectorAll('.day-toggle.active')].map(d => d.dataset.dia);

    const body = {
      horario_abertura: document.getElementById('cfgAbertura').value,
      horario_fechamento: document.getElementById('cfgFechamento').value,
      duracao_consulta: parseInt(document.getElementById('cfgDuracao').value),
      dias_funcionamento: diasSelecionados,
    };

    const result = await apiFetch('/configuracoes', { method: 'PUT', body: JSON.stringify(body) });
    showToast(result?.sucesso ? 'Configurações salvas!' : 'Erro ao salvar.', result?.sucesso ? 'success' : 'error');
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Configurações';
  });

  // ═══════════ TAB: MINHA CONTA ═══════════
  const meData = await apiFetch('/auth/me');
  if (meData && meData.usuario) {
    const u = meData.usuario;
    document.getElementById('cfgCnpj').value = u.cnpj || '';
    document.getElementById('cfgEmail').value = u.email || '';
    document.getElementById('cfgClinica').value = u.clinica_nome || '';
  }

  document.getElementById('cfgSaveBtnConta').addEventListener('click', async () => {
    const btn = document.getElementById('cfgSaveBtnConta');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    const bodyPerfil = {
      cnpj: document.getElementById('cfgCnpj').value,
      email: document.getElementById('cfgEmail').value,
      clinica_nome: document.getElementById('cfgClinica').value,
    };
    const bodyCfgWhatsApp = { whatsapp_numero: document.getElementById('cfgWhatsApp').value };

    if (!bodyPerfil.clinica_nome || !bodyPerfil.email) { showToast('Nome da Clínica e email são obrigatórios.', 'error'); btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Alterações'; return; }

    // Salva Perfil e WhatsApp simultaneamente nas duas tabelas
    const [result] = await Promise.all([
      apiFetch('/auth/perfil', { method: 'PUT', body: JSON.stringify(bodyPerfil) }),
      apiFetch('/configuracoes', { method: 'PUT', body: JSON.stringify(bodyCfgWhatsApp) })
    ]);
    if (result?.sucesso) {
      showToast('Conta atualizada!');
      localStorage.setItem('usuario', JSON.stringify(result.usuario));
      // Update sidebar
      const sideNome = document.getElementById('userName');
      const sideClinica = document.getElementById('userClinica');
      const sideAvatar = document.getElementById('userAvatar');
      if (sideClinica) sideClinica.textContent = result.usuario.clinica_nome || 'Clínica';
      if (sideNome) sideNome.textContent = result.usuario.cnpj ? `CNPJ: ${result.usuario.cnpj}` : 'CNPJ não informado';
      if (sideAvatar) sideAvatar.textContent = (result.usuario.clinica_nome || 'C').charAt(0).toUpperCase();
    } else {
      showToast(result?.erro || 'Erro ao salvar.', 'error');
    }
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Alterações';
  });

  // ═══════════ TAB: SEGURANÇA ═══════════
  document.getElementById('cfgSaveBtnSenha').addEventListener('click', async () => {
    const senhaAtual = document.getElementById('cfgSenhaAtual').value;
    const novaSenha = document.getElementById('cfgNovaSenha').value;
    const confirmar = document.getElementById('cfgConfirmarSenha').value;

    if (!senhaAtual || !novaSenha) { showToast('Preencha todos os campos.', 'error'); return; }
    if (novaSenha.length < 6) { showToast('Nova senha deve ter no mínimo 6 caracteres.', 'error'); return; }
    if (novaSenha !== confirmar) { showToast('As senhas não coincidem.', 'error'); return; }

    const btn = document.getElementById('cfgSaveBtnSenha');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Alterando...';

    const result = await apiFetch('/auth/senha', {
      method: 'PUT',
      body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha }),
    });

    if (result?.sucesso) {
      showToast('Senha alterada com sucesso!');
      document.getElementById('cfgSenhaAtual').value = '';
      document.getElementById('cfgNovaSenha').value = '';
      document.getElementById('cfgConfirmarSenha').value = '';
    } else {
      showToast(result?.erro || 'Erro ao alterar senha.', 'error');
    }
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-key"></i> Alterar Senha';
  });
});
