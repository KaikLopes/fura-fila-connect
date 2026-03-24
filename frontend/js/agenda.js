registerPage('agenda', async function () {
  const WA_NUMBER = '558387800619';
  let currentSlotId = null;
  let currentRecup = null;
  function getLocalISO(d) {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
  }

  let selectedDate = getLocalISO(new Date());

  // ═══════════ WEEK PICKER ═══════════
  const weekPicker = document.getElementById('weekPicker');
  const diasPT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function buildWeekPicker() {
    weekPicker.innerHTML = '';
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Start from today instead of last Monday
    const startDay = new Date(today);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDay);
      d.setDate(startDay.getDate() + i);
      const iso = getLocalISO(d);
      const isToday = i === 0;
      const isSelected = iso === selectedDate;

      const btn = document.createElement('button');
      btn.className = 'btn btn-sm';
      btn.style.cssText = `min-width:70px;flex-direction:column;gap:2px;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);transition:all .2s;font-size:0.75rem;`;

      if (isSelected) {
        btn.style.background = 'var(--primary)';
        btn.style.color = '#fff';
        btn.style.borderColor = 'var(--primary)';
      } else if (isToday) {
        btn.style.borderColor = 'var(--primary)';
        btn.style.color = 'var(--primary)';
      }

      btn.innerHTML = `<strong>${diasPT[d.getDay()]}</strong><span style="font-size:0.7rem;">${d.getDate()}/${d.getMonth() + 1}</span>`;
      btn.addEventListener('click', () => {
        selectedDate = iso;
        buildWeekPicker();
        loadAgenda();
      });
      weekPicker.appendChild(btn);
    }
  }
  buildWeekPicker();

  // ═══════════ TONS ═══════════
  const tonsData = await apiFetch('/agenda/tons');
  const tacticSelect = document.getElementById('waAiTactic');
  if (tonsData && tonsData.tons) {
    tacticSelect.innerHTML = '';
    tonsData.tons.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
      tacticSelect.appendChild(opt);
    });
  }

  // ═══════════ LOAD AGENDA ═══════════
  async function loadAgenda() {
    const data = await apiFetch(`/agenda/status?data=${selectedDate}`);
    if (!data) return;

    const label = document.getElementById('agendaDayLabel');
    const slotCount = document.getElementById('agendaSlotCount');
    const isToday = selectedDate === getLocalISO(new Date());
    label.textContent = isToday ? 'Atendimentos de Hoje' : `Atendimentos — ${formatDatePT(selectedDate)}`;
    slotCount.textContent = `${(data.agenda || []).length} agendados`;

    renderTable(data.agenda || [], data.fila || []);
  }

  function formatDatePT(iso) {
    if (!iso) return '—';
    let d;
    if (iso instanceof Date) {
      d = iso;
    } else {
      // Se for string, tenta limpar e garantir o fuso de Brasília (T12:00:00)
      const cleanIso = typeof iso === 'string' ? iso.split('T')[0] : iso;
      d = new Date(cleanIso + 'T12:00:00');
    }
    
    if (isNaN(d.getTime())) return 'Data Inválida';
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderTable(agenda, fila) {
    const badge = document.getElementById('agendaFilaCount');
    badge.innerHTML = `<i class="fa-solid fa-users"></i> Elegíveis: ${fila.length}`;

    const tbody = document.getElementById('agendaTbody');
    tbody.innerHTML = '';

    if (agenda.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-regular fa-calendar"></i><p>Nenhum atendimento neste dia.</p></div></td></tr>`;
      return;
    }

    agenda.forEach((item, i) => {
      const tr = document.createElement('tr');
      tr.className = 'animate-fade-in';
      tr.style.animationDelay = `${i * 0.05}s`;
      tr.setAttribute('data-slot-id', item.id);

      const hStr = typeof item.horario === 'string' ? item.horario.substring(0, 5) : item.horario;
      const prof = item.profissional_nome || '—';
      const isActive = item.status === 'Ocupado';

      let actionHtml = '';
      if (item.status === 'Realizado') {
        actionHtml = `<span class="badge badge-success" style="background:#dcfce7;color:#16a34a"><i class="fa-solid fa-check-double"></i> Realizado</span>`;
      } else if (item.status === 'Faltou') {
        actionHtml = `<span class="badge badge-danger"><i class="fa-solid fa-user-xmark"></i> Faltou</span>`;
      } else if (item.status === 'Cancelado') {
        actionHtml = `<span class="badge badge-danger">Cancelado</span>`;
      } else if (item.status === 'Aguardando Cliente') {
        actionHtml = `
          <div style="display:flex;gap:4px;flex-direction:column;">
            <span class="badge badge-warning" style="margin-bottom:4px;align-self:flex-start;"><i class="fa-solid fa-hourglass-half"></i> Aguardando</span>
            <div style="display:flex;gap:4px;">
              <button class="btn btn-sm" style="background:#dcfce7;color:#16a34a;padding:4px 8px;" title="Cliente Aceitou" data-recup-id="${item.id}" data-action="Aceitou">
                <i class="fa-solid fa-check"></i> Aceitar
              </button>
              <button class="btn btn-sm" style="background:#fee2e2;color:#ef4444;padding:4px 8px;" title="Cliente Recusou" data-recup-id="${item.id}" data-action="Recusou">
                <i class="fa-solid fa-xmark"></i> Recusar
              </button>
              <button class="btn btn-sm" style="background:#dbeafe;color:#3b82f6;padding:4px 8px;" title="Enviar WhatsApp" data-wa-regen-id="${item.id}">
                <i class="fa-brands fa-whatsapp"></i>
              </button>
            </div>
          </div>
        `;
      } else {
        actionHtml = `
          <div style="display:flex;gap:4px;">
            <button class="btn btn-sm" style="background:#dcfce7;color:#16a34a;padding:4px 8px;" title="Marcar como Realizado (Checkout)" data-finalizar-id="${item.id}" data-action="Realizado" data-cliente-id="${item.cliente_id || ''}" data-prof-id="${item.profissional_id || ''}" data-cliente-nome="${escapeHTML(item.cliente_nome || '')}" data-servico="${escapeHTML(item.servico || '')}" data-telefone="${escapeHTML(item.telefone || '')}">
              <i class="fa-solid fa-check"></i>
            </button>
            <button class="btn btn-sm" style="background:#ffedd5;color:#f97316;padding:4px 8px;" title="O paciente faltou" data-finalizar-id="${item.id}" data-action="Faltou">
              <i class="fa-solid fa-user-xmark"></i>
            </button>
            <button class="btn btn-danger-outline btn-sm" style="padding:4px 8px;" title="Cancelar" data-cancel-id="${item.id}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        `;
      }

      tr.innerHTML = `
        <td style="font-weight:600;">${hStr}</td>
        <td>
           <strong>${escapeHTML(item.cliente_nome)}</strong>
           <br><span style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(item.telefone || '')}</span>
        </td>
        <td><span class="badge badge-success">${escapeHTML(item.servico)}</span></td>
        <td style="font-size:0.85rem; color:var(--text-muted);"><i class="fa-solid fa-user-doctor"></i> ${escapeHTML(item.profissional_nome || '—')}</td>
        <td>${actionHtml}</td>`;
      
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        openDetailsModal(item);
      });

      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('[data-cancel-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCancel(parseInt(btn.dataset.cancelId), btn);
      });
    });

    tbody.querySelectorAll('[data-finalizar-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleFinalizar(parseInt(btn.dataset.finalizarId), btn.dataset.action, btn);
      });
    });

    tbody.querySelectorAll('[data-recup-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleRecuperacaoResposta(parseInt(btn.dataset.recupId), btn.dataset.action, btn);
      });
    });

    tbody.querySelectorAll('[data-wa-regen-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleWaRegen(parseInt(btn.dataset.waRegenId), btn);
      });
    });
  }

  // ═══════════ RESPOSTA FILA DE ESPERA ═══════════
  async function handleRecuperacaoResposta(id, action, btn) {
    const rowBtns = btn.closest('div').querySelectorAll('button');
    rowBtns.forEach(b => b.disabled = true);
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const result = await apiFetch('/agenda/resposta-recuperacao', {
      method: 'POST',
      body: JSON.stringify({ id, resposta: action })
    });

    if (result && result.sucesso) {
      showToast(action === 'Aceitou' ? 'Consulta confirmada!' : 'Consulta recusada.');
      loadAgenda();
      
      if (action === 'Recusou' && result.recuperacao) {
        showToast('Vaga repassada para o próximo da fila!');
        const tr = btn.closest('tr');
        const horario = tr.querySelector('.time-slot').textContent.trim();
        const servico = tr.querySelector('.service-tag').textContent;
        openWaModal(result.recuperacao, id, { horario, servico });
      } else if (action === 'Recusou' && !result.recuperacao) {
        showToast('Fila vazia. O agendamento foi cancelado.');
      }
    } else {
      showToast(result?.erro || 'Erro ao processar resposta.', 'error');
      loadAgenda();
    }
  }

  async function handleWaRegen(id, btn) {
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    
    const tr = btn.closest('tr');
    const nome = tr.querySelector('.patient-name').textContent;
    const horario = tr.querySelector('.time-slot').textContent.trim();
    const servico = tr.querySelector('.service-tag').textContent;

    const data = await apiFetch(`/agenda/regenerar?nome=${encodeURIComponent(nome)}&horario=${encodeURIComponent(horario)}&servico=${encodeURIComponent(servico)}`);
    if(data) {
       openWaModal(data, id, { horario, servico });
    }
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }

  // ═══════════ FINALIZAR / FALTOU ═══════════
  async function handleFinalizar(id, action, btn) {
    if (action === 'Realizado') {
      openCheckoutModal(id, btn);
      return; 
    }

    let valor = 0;

    const rowBtns = btn.closest('div').querySelectorAll('button');
    rowBtns.forEach(b => b.disabled = true);
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const result = await apiFetch('/agenda/finalizar', {
      method: 'POST',
      body: JSON.stringify({ id, status: action, valor })
    });

    if (result && result.sucesso) {
      showToast(`Consulta marcada como ${action}.`);
      loadAgenda();
    } else {
      showToast(result?.erro || 'Erro ao atualizar.', 'error');
      rowBtns.forEach(b => b.disabled = false);
      btn.innerHTML = action === 'Realizado' ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-user-xmark"></i>';
    }
  }

  // ═══════════ DETAILS MODAL ═══════════
  const detailsModal = document.getElementById('detailsModal');
  const detailsBody = document.getElementById('detailsModalBody');

  function openDetailsModal(item) {
    const dataFmt = formatDatePT(item.data);
    const hStr = typeof item.horario === 'string' ? item.horario.substring(0, 5) : item.horario;
    
    detailsBody.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div class="info-group">
          <label style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; font-weight:700;">Paciente</label>
          <p style="font-size:1.1rem; font-weight:600; color:var(--text-dark);">${escapeHTML(item.cliente_nome)}</p>
          <small style="color:var(--text-muted);">${escapeHTML(item.telefone || '(Sem telefone)')}</small>
        </div>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="info-group">
            <label style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; font-weight:700;">Data</label>
            <p>${dataFmt}</p>
          </div>
          <div class="info-group">
            <label style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; font-weight:700;">Horário</label>
            <p>${hStr}</p>
          </div>
        </div>

        <div class="info-group">
          <label style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; font-weight:700;">Profissional</label>
          <p><i class="fa-solid fa-user-doctor"></i> ${escapeHTML(item.profissional_nome || '—')}</p>
        </div>

        <div class="info-group">
          <label style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; font-weight:700;">Serviço/Procedimento</label>
          <p><span class="badge badge-primary">${escapeHTML(item.servico)}</span></p>
        </div>

        <div style="background:var(--bg-alt); padding:16px; border-radius:var(--radius-sm); border:1px solid var(--border);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <span style="font-weight:700; color:var(--text-dark);">STATUS</span>
             <span class="badge">${item.status}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
             <span style="font-weight:700; color:var(--text-dark);">VALOR</span>
             <span style="font-size:1.25rem; font-weight:800; color:var(--success);">R$ ${parseFloat(item.valor || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;
    detailsModal.classList.remove('hidden');
  }

  document.getElementById('detailsModalClose').addEventListener('click', () => detailsModal.classList.add('hidden'));
  document.getElementById('detailsModalOkBtn').addEventListener('click', () => detailsModal.classList.add('hidden'));
  detailsModal.addEventListener('click', (e) => { if(e.target === detailsModal) detailsModal.classList.add('hidden'); });

  // ═══════════ CHECKOUT MODAL LOGIC ═══════════
  const checkoutModal = document.getElementById('checkoutModal');
  const checkoutToggleRetorno = document.getElementById('checkoutToggleRetorno');
  const checkoutRetornoBox = document.getElementById('checkoutRetornoBox');

  checkoutToggleRetorno.addEventListener('change', (e) => {
    checkoutRetornoBox.style.display = e.target.checked ? 'block' : 'none';
  });

  function closeCheckoutModal() { checkoutModal.classList.add('hidden'); }
  document.getElementById('checkoutModalClose').addEventListener('click', closeCheckoutModal);
  document.getElementById('checkoutModalCancelBtn').addEventListener('click', closeCheckoutModal);

  function openCheckoutModal(slotId, btn) {
    const data = btn.dataset;
    document.getElementById('checkoutSlotId').value = slotId;
    document.getElementById('checkoutClienteId').value = data.clienteId;
    document.getElementById('checkoutProfissionalId').value = data.profId;
    document.getElementById('checkoutPacienteNome').textContent = data.clienteNome || 'Desconhecido';
    document.getElementById('checkoutProcedimentos').value = data.servico || '';
    document.getElementById('checkoutValor').value = '0.00';
    document.getElementById('checkoutTelefoneBackup').value = data.telefone || '';

    
    checkoutToggleRetorno.checked = false;
    checkoutRetornoBox.style.display = 'none';

    // Populate retorno date/time
    populateRetornoDateSelect();
    fetchRetornoAvailableSlots(data.profId);

    checkoutModal.classList.remove('hidden');
  }

  // Populate retorno dates
  const rDataSelect = document.getElementById('checkoutRetornoData');
  const rHorarioSelect = document.getElementById('checkoutRetornoHorario');

  function populateRetornoDateSelect() {
    rDataSelect.innerHTML = '';
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const iso = d.toLocaleString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0,10);
      const label = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} - ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()]}`;
      const opt = document.createElement('option');
      opt.value = iso;
      opt.textContent = label;
      rDataSelect.appendChild(opt);
    }
  }

  async function fetchRetornoAvailableSlots(profId) {
    const data = rDataSelect.value;
    rHorarioSelect.innerHTML = '<option value="">Carregando...</option>';
    rHorarioSelect.disabled = true;
    if (!profId) { rHorarioSelect.innerHTML = '<option value="">Profissional Indisp.</option>'; return; }
    const result = await apiFetch(`/agenda/horarios-disponiveis?data=${data}&profissional_id=${profId}`);
    rHorarioSelect.innerHTML = '';
    if (!result || !result.dia_util) { rHorarioSelect.innerHTML = '<option value="">Dia não útil</option>'; return; }
    if (result.horarios.length === 0) { rHorarioSelect.innerHTML = '<option value="">Todos ocupados</option>'; return; }
    result.horarios.forEach(h => {
      const opt = document.createElement('option'); opt.value = h; opt.textContent = h;
      rHorarioSelect.appendChild(opt);
    });
    rHorarioSelect.disabled = false;
  }

  rDataSelect.addEventListener('change', () => fetchRetornoAvailableSlots(document.getElementById('checkoutProfissionalId').value));

  document.getElementById('checkoutSaveBtn').addEventListener('click', async () => {
    const slotId = document.getElementById('checkoutSlotId').value;
    const servicoFinal = document.getElementById('checkoutProcedimentos').value;
    const valorNum = parseFloat(document.getElementById('checkoutValor').value.replace(',', '.')) || 0;
    
    const isRetornoChecked = checkoutToggleRetorno.checked;
    const rData = rDataSelect.value;
    const rHora = rHorarioSelect.value;
    const profId = document.getElementById('checkoutProfissionalId').value;
    const clienteId = document.getElementById('checkoutClienteId').value;
    const clienteNome = document.getElementById('checkoutPacienteNome').textContent;

    const btn = document.getElementById('checkoutSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Finalizando...';

    // 1. Finalizar Consulta Atual
    const finRes = await apiFetch('/agenda/finalizar', {
      method: 'POST',
      body: JSON.stringify({ id: slotId, status: 'Realizado', valor: valorNum, servico_final: servicoFinal })
    });

    if (finRes && finRes.sucesso) {
      // 2. Agendar Retorno (se marcado)
      if (isRetornoChecked && rData && rHora && profId && clienteId) {
        await apiFetch('/agenda', {
          method: 'POST',
          body: JSON.stringify({ data: rData, horario: rHora, cliente_nome: clienteNome, cliente_id: clienteId, profissional_id: profId, servico: 'Retorno: ' + servicoFinal, telefone: document.getElementById('checkoutTelefoneBackup').value })
        });
        showToast('Consulta concluída e Retorno agendado!');
      } else {
        showToast('Consulta concluída com sucesso!');
      }
      closeCheckoutModal();
      loadAgenda();
      if (typeof loadFila === 'function') loadFila();
    } else {
      showToast(finRes?.erro || 'Erro', 'error');
    }
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Concluir Atendimento';
  });

  // ═══════════ CANCEL + RECOVERY ═══════════
  async function handleCancel(id, btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const data = await apiFetch('/agenda/cancelar', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });

    if (!data) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-xmark"></i> Cancelar'; return; }

    loadAgenda();
    if (typeof loadFila === 'function') loadFila();

    if (data.recuperacao) {
      showToast('Vaga recuperada com sucesso!');
      openWaModal(data.recuperacao, id, data.cancelado);
    } else {
      showToast('Cancelado. Fila vazia.', 'error');
    }
  }

  // ═══════════ WHATSAPP MODAL ═══════════
  function openWaModal(recup, slotId, cancelado) {
    currentSlotId = slotId;
    currentRecup = { nome: recup.nome, horario: cancelado.horario, servico: cancelado.servico };

    document.getElementById('waName').textContent = recup.nome;
    document.getElementById('waMessageText').value = recup.mensagem_texto;

    if (recup.whatsapp_url && recup.whatsapp_url.includes('wa.me/?text=')) {
      showToast('Atenção: Seu número de WhatsApp não está configurado em Configurações > Clínica.', 'error');
    }

    if (tacticSelect.querySelector(`option[value="${recup.tipo_variacao}"]`)) {
      tacticSelect.value = recup.tipo_variacao;
    }

    const matchEl = document.getElementById('waIntelligenceMatch');
    if (recup.score && recup.score.motivo) {
      matchEl.classList.remove('hidden');
      document.getElementById('waMatchReason').textContent = `Match IA: ${recup.score.motivo}`;
      document.getElementById('waAddress').textContent = recup.endereco || 'Não informado';
    } else { matchEl.classList.add('hidden'); }

    const now = new Date();
    document.getElementById('waTime').textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    document.getElementById('waModal').classList.remove('hidden');
  }

  function closeWaModal() { document.getElementById('waModal').classList.add('hidden'); }

  document.getElementById('waCloseBtn').addEventListener('click', closeWaModal);
  document.getElementById('waCancelBtn').addEventListener('click', closeWaModal);
  document.getElementById('waModal').addEventListener('click', e => { if (e.target.id === 'waModal') closeWaModal(); });

  tacticSelect.addEventListener('change', async (e) => {
    if (!currentRecup) return;
    const textarea = document.getElementById('waMessageText');
    textarea.style.opacity = '0.5';
    const params = new URLSearchParams({ nome: currentRecup.nome, horario: currentRecup.horario, servico: currentRecup.servico, tom: e.target.value });
    const data = await apiFetch(`/agenda/regenerar?${params}`);
    if (data) textarea.value = data.mensagem_texto;
    textarea.style.opacity = '1';
  });

  document.getElementById('waSendBtn').addEventListener('click', async () => {
    const msg = document.getElementById('waMessageText').value;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    closeWaModal();
    if (currentSlotId) {
      await apiFetch('/agenda/confirmar', { method: 'POST', body: JSON.stringify({ id: currentSlotId }) });
      const row = document.querySelector(`tr[data-slot-id="${currentSlotId}"]`);
      if (row) { row.querySelector('td:last-child').innerHTML = '<span class="badge badge-warning">Aguardando Cliente</span>'; }
      showToast('Mensagem enviada! Status salvo.');
    }
  });

  // ═══════════ SLOT CREATION MODAL ═══════════
  const slotServicoSelect = document.getElementById('slotServico');
  const slotModal = document.getElementById('slotModal');
  const profSelect = document.getElementById('slotProfissional');
  const slotDataSelect = document.getElementById('slotData');
  const slotHorarioSelect = document.getElementById('slotHorario');

  // Populate date select with current week
  function populateDateSelect() {
    slotDataSelect.innerHTML = '';
    const today = new Date();
    const startDay = new Date(today);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDay);
      d.setDate(startDay.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const opt = document.createElement('option');
      opt.value = iso;
      const isToday = iso === today.toISOString().slice(0, 10);
      opt.textContent = `${diasPT[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}${isToday ? ' (Hoje)' : ''}`;
      opt.selected = iso === selectedDate;
      slotDataSelect.appendChild(opt);
    }
  }

  // Fetch available slots when date or professional changes
  async function fetchAvailableSlots() {
    const data = slotDataSelect.value;
    const profId = profSelect.value;
    slotHorarioSelect.innerHTML = '<option value="">Carregando...</option>';
    slotHorarioSelect.disabled = true;

    if (!profId) {
      slotHorarioSelect.innerHTML = '<option value="">Selecione o profissional primeiro</option>';
      return;
    }

    const result = await apiFetch(`/agenda/horarios-disponiveis?data=${data}&profissional_id=${profId}`);
    slotHorarioSelect.innerHTML = '';

    if (!result || !result.dia_util) {
      slotHorarioSelect.innerHTML = '<option value="">Dia não é dia útil</option>';
      slotHorarioSelect.disabled = true;
      return;
    }

    if (result.horarios.length === 0) {
      slotHorarioSelect.innerHTML = '<option value="">Todos os horários ocupados</option>';
      slotHorarioSelect.disabled = true;
      return;
    }

    result.horarios.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = h;
      slotHorarioSelect.appendChild(opt);
    });
    slotHorarioSelect.disabled = false;
  }

  slotDataSelect.addEventListener('change', fetchAvailableSlots);

  let profissionaisCache = [];

  async function loadProfSelect() {
    const data = await apiFetch('/profissionais');
    if (!data) return;
    profissionaisCache = data.profissionais || [];
    profSelect.innerHTML = '<option value="">— Selecione um profissional —</option>';
    profissionaisCache.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nome}${p.especialidade ? ' — ' + p.especialidade : ''}`;
      profSelect.appendChild(opt);
    });
    // Reset service select
    slotServicoSelect.innerHTML = '<option value="">Selecione o profissional primeiro</option>';
    slotServicoSelect.disabled = true;
  }

  // When professional changes, load their services
  profSelect.addEventListener('change', () => {
    const profId = profSelect.value;
    slotServicoSelect.innerHTML = '';
    if (!profId) {
      slotServicoSelect.innerHTML = '<option value="">Selecione o profissional primeiro</option>';
      slotServicoSelect.disabled = true;
      return;
    }
    const prof = profissionaisCache.find(p => p.id === parseInt(profId));
    if (prof && Array.isArray(prof.servicos) && prof.servicos.length > 0) {
      prof.servicos.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        slotServicoSelect.appendChild(opt);
      });
      slotServicoSelect.disabled = false;
    } else {
      slotServicoSelect.innerHTML = '<option value="">Nenhum serviço cadastrado</option>';
      slotServicoSelect.disabled = true;
    }
    
    // Also re-fetch available slots since it depends on the professional now
    fetchAvailableSlots();
  });

  // ═══════════ CLIENT SEARCH AUTOCOMPLETE ═══════════
  const slotClienteInput = document.getElementById('slotCliente');
  const slotClienteIdInput = document.getElementById('slotClienteId');
  const slotClienteDropdown = document.getElementById('slotClienteDropdown');
  let searchTimeout = null;

  slotClienteInput.addEventListener('input', () => {
    slotClienteIdInput.value = ''; // Clear selected client on edit
    const q = slotClienteInput.value.trim();
    clearTimeout(searchTimeout);
    if (q.length < 2) { slotClienteDropdown.style.display = 'none'; return; }

    searchTimeout = setTimeout(async () => {
      const result = await apiFetch(`/clientes/busca?q=${encodeURIComponent(q)}`);
      slotClienteDropdown.innerHTML = '';
      if (!result || !result.clientes || result.clientes.length === 0) {
        slotClienteDropdown.innerHTML = `
          <div style="padding:10px;color:var(--text-muted);font-size:0.85rem;">
            <i class="fa-solid fa-user-plus"></i> Nenhum cliente encontrado. Será cadastrado automaticamente.
          </div>`;
        slotClienteDropdown.style.display = 'block';
        return;
      }

      result.clientes.forEach(c => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:10px 14px;cursor:pointer;border-bottom:1px solid #f0f0f0;font-size:0.85rem;transition:background .15s;';
        item.innerHTML = `<strong>${escapeHTML(c.nome)}</strong><span style="color:var(--text-muted);margin-left:8px;">${escapeHTML(c.cpf || '')}</span><br><small style="color:var(--text-muted);">${escapeHTML(c.telefone || '')}</small>`;
        item.addEventListener('mouseenter', () => item.style.background = '#f5f7fa');
        item.addEventListener('mouseleave', () => item.style.background = '');
        item.addEventListener('click', () => {
          slotClienteInput.value = c.nome;
          slotClienteIdInput.value = c.id;
          document.getElementById('slotTelefone').value = c.telefone || '';
          slotClienteDropdown.style.display = 'none';
        });
        slotClienteDropdown.appendChild(item);
      });
      slotClienteDropdown.style.display = 'block';
    }, 300);
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#slotClienteDropdown') && e.target !== slotClienteInput) {
      slotClienteDropdown.style.display = 'none';
    }
  });

  function openSlotModal() {
    slotClienteInput.value = '';
    slotClienteIdInput.value = '';
    document.getElementById('slotTelefone').value = '';
    slotServicoSelect.innerHTML = '<option value="">Selecione o profissional primeiro</option>';
    slotServicoSelect.disabled = true;
    profSelect.value = '';
    slotClienteDropdown.style.display = 'none';
    populateDateSelect();
    loadProfSelect();
    fetchAvailableSlots();
    slotModal.classList.remove('hidden');
  }
  function closeSlotModal() { slotModal.classList.add('hidden'); }

  document.getElementById('btnAddSlot').addEventListener('click', openSlotModal);
  document.getElementById('slotModalClose').addEventListener('click', closeSlotModal);
  document.getElementById('slotModalCancelBtn').addEventListener('click', closeSlotModal);
  slotModal.addEventListener('click', e => { if (e.target === slotModal) closeSlotModal(); });

  document.getElementById('slotSaveBtn').addEventListener('click', async () => {
    const horario = slotHorarioSelect.value;
    const cliente = slotClienteInput.value;
    const data = slotDataSelect.value;
    const servico = slotServicoSelect.value;
    const profId = profSelect.value;
    if (!horario || !cliente || !profId || !servico) { showToast('Preencha todos os campos obrigatórios.', 'error'); return; }

    const btn = document.getElementById('slotSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    const body = {
      data,
      horario,
      cliente_nome: cliente,
      cliente_id: slotClienteIdInput.value ? parseInt(slotClienteIdInput.value) : null,
      servico: servico,
      telefone: document.getElementById('slotTelefone').value || '',
      profissional_id: profSelect.value ? parseInt(profSelect.value) : null,
    };

    const result = await apiFetch('/agenda', { method: 'POST', body: JSON.stringify(body) });
    if (result && result.sucesso) {
      const msg = result.auto_cadastrado
        ? 'Agendamento criado e paciente cadastrado automaticamente!'
        : 'Agendamento criado com sucesso!';
      showToast(msg);
      closeSlotModal();
      selectedDate = data;
      buildWeekPicker();
      loadAgenda();
    } else {
      showToast(result?.erro || 'Erro ao criar agendamento.', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-save"></i> Agendar';
  });

  applyPhoneMask(document.getElementById('slotTelefone'));

  // ═══════════ FILA DE ESPERA (LOGIC) ═══════════
  const queueModal = document.getElementById('queueModal');
  const queueClienteInput = document.getElementById('queueClienteInput');
  const queueClienteIdInput = document.getElementById('queueClienteId');
  const queueClienteDropdown = document.getElementById('queueClienteDropdown');
  const filaEsperaList = document.getElementById('filaEsperaList');

  async function loadFila() {
    const data = await apiFetch('/agenda/fila');
    if (!data) return;
    renderFila(data.fila || []);
    const badge = document.getElementById('agendaFilaCount');
    if(badge) badge.innerHTML = `<i class="fa-solid fa-users"></i> Fila: ${data.fila ? data.fila.length : 0}`;
  }

  function renderFila(list) {
    filaEsperaList.innerHTML = '';
    if (list.length === 0) {
      filaEsperaList.innerHTML = '<div class="empty-state" style="padding:20px 0;"><p style="font-size:0.75rem;">Fila vazia</p></div>';
      return;
    }

    list.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'animate-fade-in';
      div.style.cssText = `
        padding: 10px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); 
        margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; animation-delay: ${i * 0.05}s;
      `;
      div.innerHTML = `
        <div style="flex:1;">
          <h5 style="margin:0; font-size:0.85rem; color:var(--text-dark);">${escapeHTML(item.nome)}</h5>
          <small style="color:var(--text-muted);">${escapeHTML(item.telefone || '')}</small>
        </div>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger); padding:4px 8px;" onclick="removeFromFila(${item.id})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;
      filaEsperaList.appendChild(div);
    });
  }

  window.removeFromFila = async (id) => {
    if (!confirm('Remover este paciente da fila?')) return;
    const result = await apiFetch(`/agenda/fila/${id}`, { method: 'DELETE' });
    if (result && result.sucesso) {
      showToast('Removido da fila.');
      loadFila();
    }
  };

  function openQueueModal() {
    queueClienteInput.value = '';
    queueClienteIdInput.value = '';
    queueClienteDropdown.style.display = 'none';
    queueModal.classList.remove('hidden');
  }
  function closeQueueModal() { queueModal.classList.add('hidden'); }

  document.getElementById('btnOpenQueue').addEventListener('click', openQueueModal);
  document.getElementById('queueModalClose').addEventListener('click', closeQueueModal);
  document.getElementById('queueModalCancelBtn').addEventListener('click', closeQueueModal);
  queueModal.addEventListener('click', e => { if (e.target === queueModal) closeQueueModal(); });

  // Autocomplete Fila
  queueClienteInput.addEventListener('input', () => {
    queueClienteIdInput.value = '';
    const q = queueClienteInput.value.trim();
    if (q.length < 2) { queueClienteDropdown.style.display = 'none'; return; }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      const result = await apiFetch(`/clientes/busca?q=${encodeURIComponent(q)}`);
      queueClienteDropdown.innerHTML = '';
      if (!result || !result.clientes || result.clientes.length === 0) {
        queueClienteDropdown.style.display = 'none'; return;
      }
      result.clientes.forEach(c => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--border); font-size:0.8rem;';
        item.innerHTML = `<strong>${escapeHTML(c.nome)}</strong> <span style="color:var(--text-muted);">${escapeHTML(c.telefone || '')}</span>`;
        item.addEventListener('click', () => {
          queueClienteInput.value = c.nome;
          queueClienteIdInput.value = c.id;
          queueClienteDropdown.style.display = 'none';
        });
        queueClienteDropdown.appendChild(item);
      });
      queueClienteDropdown.style.display = 'block';
    }, 300);
  });

  document.getElementById('queueSaveBtn').addEventListener('click', async () => {
    const clienteId = queueClienteIdInput.value;
    if (!clienteId) { showToast('Selecione um paciente cadastrado.', 'error'); return; }

    const result = await apiFetch('/agenda/fila', {
      method: 'POST',
      body: JSON.stringify({ cliente_id: clienteId })
    });

    if (result && result.sucesso) {
      showToast('Adicionado à fila de espera!');
      closeQueueModal();
      loadFila();
    } else {
      showToast(result?.erro || 'Erro ao adicionar à fila.', 'error');
    }
  });

  loadAgenda();
  loadFila();
});
