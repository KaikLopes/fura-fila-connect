registerPage('dashboard', async function () {
  // Dynamic greeting
  const hora = new Date().getHours();
  let saudacao = 'Olá';
  if (hora < 12) saudacao = 'Bom dia';
  else if (hora < 18) saudacao = 'Boa tarde';
  else saudacao = 'Boa noite';
  document.getElementById('dashGreeting').textContent = `${saudacao}!`;

  const data = await apiFetch('/dashboard');
  if (!data || !data.dashboard) return;
  const d = data.dashboard;

  // Row 1
  document.getElementById('statConsultas').textContent = d.consultas_hoje;
  document.getElementById('statConfirmadas').textContent = d.confirmadas_hoje;
  document.getElementById('statPendentes').textContent = d.pendentes_hoje;
  document.getElementById('statDisponiveis').textContent = d.horarios_disponiveis;

  // Row 2
  document.getElementById('statCancelamentos').textContent = d.cancelamentos_hoje;
  document.getElementById('statRecuperadas').textContent = d.vagas_recuperadas;
  document.getElementById('statFila').textContent = d.fila_atual;
  document.getElementById('dashSemana').textContent = d.consultas_semana;
  document.getElementById('dashFaturamento').textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.faturamento_hoje);

  // Overview
  document.getElementById('statTaxa').textContent = d.taxa_recuperacao + '%';
  document.getElementById('barTaxa').style.width = d.taxa_recuperacao + '%';
  document.getElementById('statProxVago').textContent = d.proximo_horario_vago
    ? d.proximo_horario_vago.substring(0, 5) : 'Nenhum';
  document.getElementById('statProfTop').textContent = d.profissional_top_cancelamentos;

  // Ranking de Serviços
  const rkContainer = document.getElementById('rankingServicos');
  if (rkContainer) {
    const rankingData = d.ranking_servicos || [];
    if (rankingData.length > 0) {
      rkContainer.innerHTML = rankingData.map((item, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;font-size:0.85rem;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="font-weight:700;color:var(--text-muted);width:16px;">${i+1}º</div>
            <div>
              <p style="font-weight:600; font-size:0.9rem; margin-bottom:2px;">${escapeHTML(item.servico)}</p>
              <p style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(item.profissional || 'Sistema')}</p>
            </div>
          </div>
          <div class="badge badge-primary" style="font-size:0.75rem;padding:2px 6px;">${item.qtd}x</div>
        </div>
      `).join('');
    } else {
      rkContainer.innerHTML = '<div class="empty-state" style="padding:10px;text-align:center;"><i class="fa-solid fa-chart-simple" style="font-size:1.2rem;color:var(--text-muted);"></i><p style="font-size:0.8rem;margin-top:8px;">Nenhum dado de ranking ainda.</p><p style="font-size:0.65rem;color:var(--text-muted);margin-top:4px;">Serviços mais agendados aparecerão aqui.</p></div>';
    }
  }

  // Next appointments
  const container = document.getElementById('dashProximas');
  const proximas = d.proximas_consultas || [];
  if (proximas.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;"><i class="fa-regular fa-calendar" style="font-size:1.5rem;"></i><p style="margin-top:8px;">Nenhuma consulta agendada para hoje.</p></div>';
    return;
  }

  let html = '';
  proximas.forEach(c => {
    const badgeClass = c.status === 'Confirmado' ? 'badge-success' : c.status === 'Agendado' ? 'badge-warning' : 'badge-info';
    html += `
      <div class="dash-list-item">
        <div style="display:flex; align-items:center;">
          <div class="dash-list-time">${(c.horario || '').substring(0, 5)}</div>
          <div class="dash-list-info">
            <div class="dash-list-name">${c.cliente_nome}</div>
            <div class="dash-list-sub">
              ${c.servico ? `<span><i class="fa-solid fa-stethoscope"></i> ${c.servico}</span>` : ''}
              ${c.profissional_nome ? `<span style="margin-left:8px;"><i class="fa-regular fa-user"></i> ${c.profissional_nome}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="badge ${badgeClass}">${c.status}</div>
      </div>`;
  });
  container.innerHTML = html;
});
