registerPage('profissionais', async function () {
  const tbody = document.getElementById('profTbody');
  const modal = document.getElementById('profModal');
  const form = document.getElementById('profForm');

  async function load() {
    const data = await apiFetch('/profissionais');
    if (!data) return;
    render(data.profissionais || []);
  }

  function render(list) {
    tbody.innerHTML = '';
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-user-doctor"></i><p>Nenhum profissional cadastrado.</p></div></td></tr>';
      return;
    }
    list.forEach((p, i) => {
      const tr = document.createElement('tr');
      tr.className = 'animate-fade-in';
      tr.style.animationDelay = `${i * 0.05}s`;

      tr.innerHTML = `
        <td><strong>${escapeHTML(p.nome)}</strong></td>
        <td style="font-size:0.85rem;color:var(--text-muted);">${escapeHTML(p.crm) || '—'}</td>
        <td style="font-size:0.85rem;">${escapeHTML(p.especialidade) || '—'}</td>
        <td>${(p.servicos || []).map(s => `<span class="badge badge-info" style="margin-right:4px;">${escapeHTML(s)}</span>`).join('')}</td>
        <td>${escapeHTML(p.telefone) || '—'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-edit="${p.id}"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-ghost btn-sm" data-del="${p.id}" style="color:var(--danger);"><i class="fa-solid fa-trash"></i></button>
        </td>`;
      tbody.appendChild(tr);
    });

    // Delegation
    tbody.onclick = async (e) => {
      const btnEdit = e.target.closest('[data-edit]');
      const btnDel = e.target.closest('[data-del]');

      if (btnEdit) {
        const id = parseInt(btnEdit.dataset.edit);
        const prof = list.find(p => p.id === id);
        if (prof) openModal(prof);
      }

      if (btnDel) {
        if (!confirm('Remover este profissional?')) return;
        const id = btnDel.dataset.del;
        const res = await apiFetch(`/profissionais/${id}`, { method: 'DELETE' });
        if (res && res.sucesso) {
          showToast('Profissional removido.');
          load();
        } else {
          showToast(res?.erro || 'Falha ao remover profissional.', 'error');
        }
      }
    };
  }

  function openModal(prof = null) {
    document.getElementById('profModalTitle').textContent = prof ? 'Editar Profissional' : 'Novo Profissional';
    document.getElementById('profId').value = prof?.id || '';
    document.getElementById('profNome').value = prof?.nome || '';
    document.getElementById('profEspecialidade').value = prof?.especialidade || '';
    document.getElementById('profCrm').value = prof?.crm || '';
    document.getElementById('profTelefone').value = prof?.telefone || '';
    document.getElementById('profServicos').value = Array.isArray(prof?.servicos) ? prof.servicos.join(', ') : '';
    modal.classList.remove('hidden');
  }

  function closeModal() { modal.classList.add('hidden'); form.reset(); }

  document.getElementById('btnAddProf').addEventListener('click', () => openModal());
  document.getElementById('profModalClose').addEventListener('click', closeModal);
  document.getElementById('profModalCancelBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  document.getElementById('profSaveBtn').addEventListener('click', async () => {
    const id = document.getElementById('profId').value;
    const servicosRaw = document.getElementById('profServicos').value;
    const servicos = servicosRaw.split(',').map(s => s.trim()).filter(s => s.length > 0);

    const body = {
      nome: document.getElementById('profNome').value,
      crm: document.getElementById('profCrm').value,
      especialidade: document.getElementById('profEspecialidade').value,
      telefone: document.getElementById('profTelefone').value,
      servicos,
    };
    if (!body.nome || !body.crm) { showToast('Nome e CRM são obrigatórios.', 'error'); return; }
    if (servicos.length === 0) { showToast('Informe pelo menos um serviço.', 'error'); return; }

    const res = await apiFetch(id ? `/profissionais/${id}` : '/profissionais', { 
      method: id ? 'PUT' : 'POST', 
      body: JSON.stringify(body) 
    });

    if (res && res.sucesso) {
      showToast(id ? 'Profissional atualizado!' : 'Profissional cadastrado!');
      closeModal();
      load();
    } else {
      showToast(res?.erro || 'Erro ao salvar profissional.', 'error');
    }
    closeModal();
    applyPhoneMask(document.getElementById('profTelefone'));

    load();
  });

  load();
});
