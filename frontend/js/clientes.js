registerPage('clientes', async function () {
  const tbody = document.getElementById('clientesTbody');
  const modal = document.getElementById('clienteModal');
  const form = document.getElementById('clienteForm');
  const secResp = document.getElementById('secResponsavel');

  // ═══════════ MINOR DETECTION ═══════════
  function checkMenor() {
    const nascInput = document.getElementById('clienteNascimento').value;
    if (!nascInput) { secResp.style.display = 'none'; return; }
    const nasc = new Date(nascInput);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    secResp.style.display = idade < 18 ? '' : 'none';
  }
  document.getElementById('clienteNascimento').addEventListener('change', checkMenor);

  // ═══════════ SEARCH / FILTER ═══════════
  const searchInput = document.getElementById('clienteSearch');
  let searchTimeout = null;
  let allClientes = [];

  async function load() {
    const data = await apiFetch('/clientes');
    if (!data) return;
    allClientes = data.clientes || [];
    render(allClientes);
  }

  // Search functionality
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const q = searchInput.value.trim();

      if (q.length < 2) {
        render(allClientes);
        return;
      }

      searchTimeout = setTimeout(async () => {
        const result = await apiFetch(`/clientes/busca?q=${encodeURIComponent(q)}`);
        if (result && result.clientes) {
          render(result.clientes);
        }
      }, 300);
    });
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR');
  }

  function calcIdade(nascISO) {
    if (!nascISO) return null;
    const nasc = new Date(nascISO);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  }

  function render(list) {
    tbody.innerHTML = '';
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-users"></i><p>Nenhum paciente cadastrado.</p></div></td></tr>';
      return;
    }
    list.forEach((c, i) => {
      const tr = document.createElement('tr');
      tr.className = 'animate-fade-in';
      tr.style.animationDelay = `${i * 0.04}s`;

      const idade = calcIdade(c.data_nascimento);
      const menorBadge = idade !== null && idade < 18
        ? ' <span class="badge badge-warning" style="font-size:0.65rem;">Menor</span>' : '';
      const histCount = (c.historico_consultas || []).length;

      tr.innerHTML = `
        <td><strong>${escapeHTML(c.nome)}</strong>${menorBadge}</td>
        <td style="font-size:0.85rem;color:var(--text-muted);">${escapeHTML(c.cpf) || '—'}</td>
        <td style="font-size:0.85rem;">${formatDate(c.data_nascimento)}${idade !== null ? ` <small>(${idade}a)</small>` : ''}</td>
        <td>${escapeHTML(c.telefone) || '—'}</td>
        <td><span class="badge badge-info">${histCount}</span></td>
        <td>
          <button class="btn btn-ghost btn-sm" data-edit="${c.id}"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-ghost btn-sm" data-del="${c.id}" style="color:var(--danger);"><i class="fa-solid fa-trash"></i></button>
        </td>`;
      tbody.appendChild(tr);
    });

    // Delegation for Actions
    tbody.onclick = async (e) => {
      const btnEdit = e.target.closest('[data-edit]');
      const btnDel = e.target.closest('[data-del]');

      if (btnEdit) {
        const id = parseInt(btnEdit.dataset.edit);
        const cl = list.find(c => c.id === id);
        if (cl) openModal(cl);
      }

      if (btnDel) {
        const confirmed = await confirmAction(
          'Remover Paciente',
          'Tem certeza que deseja remover este paciente? Esta ação não pode ser desfeita.'
        );
        if (!confirmed) return;
        const id = btnDel.dataset.del;
        const res = await apiFetch(`/clientes/${id}`, { method: 'DELETE' });
        if (res && res.sucesso) {
          showToast('Paciente removido.');
          load();
        } else {
          showToast(res?.erro || 'Falha ao remover paciente.', 'error');
        }
      }
    };
  }

  // ═══════════ MODAL OPEN/CLOSE ═══════════
  function openModal(cl = null) {
    document.getElementById('clienteModalTitle').textContent = cl ? 'Editar Paciente' : 'Novo Paciente';
    document.getElementById('clienteId').value = cl?.id || '';
    document.getElementById('clienteNome').value = cl?.nome || '';
    document.getElementById('clienteCpf').value = cl?.cpf || '';
    document.getElementById('clienteNascimento').value = cl?.data_nascimento ? cl.data_nascimento.substring(0, 10) : '';
    document.getElementById('clienteSexo').value = cl?.sexo || '';
    document.getElementById('clienteTelefone').value = cl?.telefone || '';
    document.getElementById('clienteEndereco').value = cl?.endereco || '';
    document.getElementById('clienteSangue').value = cl?.tipo_sanguineo || '';
    document.getElementById('clienteAlergias').value = cl?.alergias || '';
    document.getElementById('clienteObs').value = cl?.observacoes_medicas || '';
    document.getElementById('clienteRespNome').value = cl?.responsavel_nome || '';
    document.getElementById('clienteRespCpf').value = cl?.responsavel_cpf || '';
    document.getElementById('clienteRespTel').value = cl?.responsavel_tel || '';
    document.getElementById('clienteEmergNome').value = cl?.contato_emergencia_nome || '';
    document.getElementById('clienteEmergTel').value = cl?.contato_emergencia_tel || '';
    checkMenor();
    modal.classList.remove('hidden');
  }

  function closeModal() { modal.classList.add('hidden'); form.reset(); secResp.style.display = 'none'; }

  document.getElementById('btnAddCliente').addEventListener('click', () => openModal());
  document.getElementById('clienteModalClose').addEventListener('click', closeModal);
  document.getElementById('clienteModalCancelBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // ═══════════ SAVE ═══════════
  document.getElementById('clienteSaveBtn').addEventListener('click', async () => {
    const id = document.getElementById('clienteId').value;
    const body = {
      nome: document.getElementById('clienteNome').value,
      cpf: document.getElementById('clienteCpf').value,
      data_nascimento: document.getElementById('clienteNascimento').value || null,
      sexo: document.getElementById('clienteSexo').value,
      telefone: document.getElementById('clienteTelefone').value,
      endereco: document.getElementById('clienteEndereco').value,
      tipo_sanguineo: document.getElementById('clienteSangue').value,
      alergias: document.getElementById('clienteAlergias').value,
      observacoes_medicas: document.getElementById('clienteObs').value,
      responsavel_nome: document.getElementById('clienteRespNome').value,
      responsavel_cpf: document.getElementById('clienteRespCpf').value,
      responsavel_tel: document.getElementById('clienteRespTel').value,
      contato_emergencia_nome: document.getElementById('clienteEmergNome').value,
      contato_emergencia_tel: document.getElementById('clienteEmergTel').value,
    };

    if (!body.nome || !body.telefone || !body.cpf) { 
      showToast('Nome, telefone e CPF são obrigatórios.', 'error'); 
      return; 
    }

    const btn = document.getElementById('clienteSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    const res = await apiFetch(id ? `/clientes/${id}` : '/clientes', { 
      method: id ? 'PUT' : 'POST', 
      body: JSON.stringify(body) 
    });

    if (res && res.sucesso) {
      showToast(id ? 'Paciente atualizado!' : 'Paciente cadastrado!');
      closeModal();
      load();
    } else {
      showToast(res?.erro || 'Erro ao salvar paciente.', 'error');
    }
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar';
  });

  applyPhoneMask(document.getElementById('clienteTelefone'));
  applyPhoneMask(document.getElementById('clienteRespTel'));
  applyPhoneMask(document.getElementById('clienteEmergTel'));

  load();
});
