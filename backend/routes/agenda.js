const express = require('express');
const pool = require('../db/pool');
const { formatPhoneBR, isValidDate } = require('../utils/formatters');

const router = express.Router();

// ══════════════════════════════════════════════════════════════════════
//  INTELIGÊNCIA DE FILA — SCORING
// ══════════════════════════════════════════════════════════════════════

function calcularScore(cliente, horarioCancelado, servicoCancelado) {
  let score = 0;
  const sCanc = servicoCancelado || '';

  // 1. Serviço desejado
  if (cliente.servico_desejado && sCanc && cliente.servico_desejado.toLowerCase() === sCanc.toLowerCase()) {
    score += 50;
  }

  const diaSemanaHoje = new Date().getDay();
  if (cliente.historico && cliente.historico.length > 0) {
    const diasHist = cliente.historico.map(c => new Date(c.data + 'T12:00:00').getDay());
    score += diasHist.filter(d => d === diaSemanaHoje).length * 25;
    score += cliente.historico.length * 5;
  }

  if (cliente.horario_preferido) {
    const prefStr = typeof cliente.horario_preferido === 'string'
      ? cliente.horario_preferido
      : cliente.horario_preferido.toString();
    const [hP, mP] = prefStr.split(':').map(Number);
    const [hC, mC] = horarioCancelado.split(':').map(Number);
    const diff = Math.abs((hP * 60 + (mP || 0)) - (hC * 60 + (mC || 0)));
    if (diff === 0) score += 10;
    if (diff <= 60) score += 20;
  }

  return score;
}

function selecionarMelhor(clientes, horario, servico) {
  if (clientes.length === 0) return null;
  let best = { idx: 0, score: -1 };
  clientes.forEach((c, i) => {
    const s = calcularScore(c, horario, servico);
    if (s > best.score) { best = { idx: i, score: s }; }
  });

  const escolhido = clientes[best.idx];
  const motivos = [];
  const servStr = servico || '';

  if (escolhido.servico_desejado && servStr && escolhido.servico_desejado.toLowerCase() === servStr.toLowerCase())
    motivos.push('serviço desejado compatível');
  if (escolhido.horario_preferido) {
    const prefStr = typeof escolhido.horario_preferido === 'string'
      ? escolhido.horario_preferido : escolhido.horario_preferido.toString();
    const [hP] = prefStr.split(':').map(Number);
    const [hC] = horario.split(':').map(Number);
    if (Math.abs(hP - hC) <= 1) motivos.push('horário preferido próximo');
  }
  if (escolhido.historico?.length > 0)
    motivos.push(`${escolhido.historico.length} consultas anteriores`);

  return {
    idx: best.idx,
    cliente: escolhido,
    score: best.score,
    motivo: motivos.length > 0 ? motivos.join(', ') : 'primeiro da fila',
  };
}

// ══════════════════════════════════════════════════════════════════════
//  MENSAGENS IA — 5 TONS
// ══════════════════════════════════════════════════════════════════════

const TONS = ['urgente', 'calma', 'persuasiva', 'exclusividade', 'cordialidade'];

function gerarVariacoes(nome, horario, servico, clinicaNome) {
  const cl = clinicaNome || 'nossa clínica';
  return {
    urgente: `[URGENTE] ${nome}, surgiu uma vaga AGORA para ${servico} às ${horario}!\n\nO horário é daqui a pouco e vai embora rápido. Não perca essa chance na ${cl}!\n\nResponda JÁ com SIM para garantir!`,
    calma: `Olá, ${nome}! Tudo bem?\n\nPassando para avisar com calma: abriu uma vaguinha para ${servico} às ${horario} na ${cl}. Sem pressa. Só quis te avisar primeiro!\n\nSe quiser, é só me responder quando puder. Fico no aguardo!`,
    persuasiva: `${nome}, tenho uma proposta especial pra você!\n\nSei que ${servico} é algo que você vem cuidando, e acaba de liberar o horário das ${horario} na ${cl}. Quem cuida da saúde investe no que mais importa!\n\nÉ a oportunidade perfeita. Garanta agora, basta responder SIM!`,
    exclusividade: `[EXCLUSIVO] ${nome}, temos uma oportunidade!\n\nLiberou o horário das ${horario} para ${servico} na ${cl}. Você é a primeira pessoa a saber — está na nossa lista de prioridade!\n\nQuer aproveitar? Responda SIM e deixamos tudo pronto pra você!`,
    cordialidade: `Bom dia, ${nome}!\n\nPassando para avisar que abriu uma vaguinha para ${servico} às ${horario} na ${cl}. Sabemos que você estava aguardando, então pensamos logo em você!\n\nSe tiver interesse, é só responder aqui. Vai ser um prazer te atender!`,
  };
}

function tomAutomatico(variacoes, horario) {
  const agora = new Date();
  const [h, m] = horario.split(':').map(Number);
  const alvo = new Date(); alvo.setHours(h, m || 0, 0, 0);
  const diff = (alvo - agora) / 3600000;
  if (diff <= 1) return { tipo: 'urgente', mensagem: variacoes.urgente };
  if (diff <= 3) return { tipo: 'persuasiva', mensagem: variacoes.persuasiva };
  if (diff <= 5) return { tipo: 'exclusividade', mensagem: variacoes.exclusividade };
  return { tipo: 'calma', mensagem: variacoes.calma };
}

async function getWhatsAppNumero(usuarioId) {
  const r = await pool.query('SELECT whatsapp_numero FROM configuracoes WHERE usuario_id = $1', [usuarioId]);
  return (r.rows[0] && r.rows[0].whatsapp_numero) || null;
}

async function getClinicaNome(usuarioId) {
  const r = await pool.query('SELECT clinica_nome FROM configuracoes WHERE usuario_id = $1', [usuarioId]);
  return r.rows[0]?.clinica_nome || 'Clínica Santa Terezinha';
}

function deepLink(numero, msg) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
}

// ═══════════════ ENDPOINTS ═══════════════

// GET /api/agenda/horarios-disponiveis?data=YYYY-MM-DD&profissional_id=XX
router.get('/horarios-disponiveis', async (req, res) => {
  try {
    const dataParam = req.query.data || new Date().toLocaleString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 10);
    const profId = req.query.profissional_id;
    if (!profId) return res.status(400).json({ erro: 'profissional_id é obrigatório.' });
    if (!isValidDate(dataParam)) return res.status(400).json({ erro: 'Data inválida. Use formato YYYY-MM-DD.' });

    // Get business config
    const cfgResult = await pool.query(
      'SELECT horario_abertura, horario_fechamento, duracao_consulta, dias_funcionamento FROM configuracoes WHERE usuario_id = $1',
      [req.usuarioId]
    );
    const cfg = cfgResult.rows[0] || { horario_abertura: '08:00', horario_fechamento: '18:00', duracao_consulta: 30, dias_funcionamento: ['Segunda','Terca','Quarta','Quinta','Sexta'] };

    const abertura = typeof cfg.horario_abertura === 'string' ? cfg.horario_abertura.substring(0,5) : '08:00';
    const fechamento = typeof cfg.horario_fechamento === 'string' ? cfg.horario_fechamento.substring(0,5) : '18:00';
    const duracao = cfg.duracao_consulta || 30;

    // Check if the day is a working day
    const diasMap = ['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'];
    const dayOfWeek = new Date(dataParam + 'T12:00:00').getDay();
    const diasFuncionamento = cfg.dias_funcionamento || ['Segunda','Terca','Quarta','Quinta','Sexta'];
    if (!diasFuncionamento.includes(diasMap[dayOfWeek])) {
      return res.json({ sucesso: true, data: dataParam, dia_util: false, horarios: [], mensagem: 'Dia não é dia útil.' });
    }

    // Generate all slots
    const [hA, mA] = abertura.split(':').map(Number);
    const [hF, mF] = fechamento.split(':').map(Number);
    const inicioMin = hA * 60 + (mA || 0);
    const fimMin = hF * 60 + (mF || 0);

    const todos = [];
    for (let m = inicioMin; m + duracao <= fimMin; m += duracao) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      todos.push(`${hh}:${mm}`);
    }

    // Obter ocupados para O PROFISSIONAL
    const ocupados = await pool.query(
      `SELECT horario FROM agenda WHERE usuario_id = $1 AND profissional_id = $2 AND data = $3 AND status != 'Cancelado'`,
      [req.usuarioId, profId, dataParam]
    );
    const ocupadosSet = new Set(
      ocupados.rows.map(r => {
        return typeof r.horario === 'string' ? r.horario.substring(0,5) : r.horario.toString().substring(0,5);
      })
    );

    const hojeIso = new Date().toLocaleString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 10);
    const isToday = dataParam === hojeIso;
    
    // Obter hora atual no fuso de Brasília seguro via ECMAScript Intl API
    const now = new Date();
    const brTimeString = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    const [brHH, brMM] = brTimeString.split(':').map(Number);
    const horaAtualMin = brHH * 60 + brMM;

    const disponiveis = todos.filter(h => {
      if (ocupadosSet.has(h)) return false;
      if (isToday) {
        const [hh, mm] = h.split(':').map(Number);
        if ((hh * 60 + mm) < horaAtualMin) return false;
      }
      return true;
    });

    res.json({ sucesso: true, data: dataParam, dia_util: true, horarios: disponiveis, total_slots: todos.length, ocupados: ocupadosSet.size });
  } catch (err) {
    console.error('Erro horarios-disponiveis:', err.message);
    res.status(500).json({ erro: 'Falha ao calcular horários.' });
  }
});

// GET /api/agenda — lista agenda (aceita ?data=YYYY-MM-DD, default hoje)
router.get('/', async (req, res) => {
  try {
    const dataParam = req.query.data || new Date().toLocaleString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 10);
    if (!isValidDate(dataParam)) return res.status(400).json({ erro: 'Data inválida. Use formato YYYY-MM-DD.' });

    // Auto-timeout
    if (dataParam === new Date().toLocaleString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 10)) {
      const expiredSlots = await pool.query(
        `SELECT id, horario, servico FROM agenda WHERE usuario_id = $1 AND data = $2 AND status = 'Aguardando Cliente' AND recuperacao_expira_em < current_timestamp`,
        [req.usuarioId, dataParam]
      );
      for (const slot of expiredSlots.rows) {
        const hStr = typeof slot.horario === 'string' ? slot.horario.substring(0,5) : slot.horario.toString().substring(0,5);
        await processarProximoFila(slot.id, req.usuarioId, hStr, slot.servico);
      }
    }
    const agenda = await pool.query(
      `SELECT a.*, p.nome AS profissional_nome, p.especialidade
       FROM agenda a
       LEFT JOIN profissionais p ON a.profissional_id = p.id
       WHERE a.usuario_id = $1 AND a.data = $2
       ORDER BY a.horario`,
      [req.usuarioId, dataParam]
    );
    res.json({ sucesso: true, data: dataParam, agenda: agenda.rows });
  } catch (err) {
    console.error('Erro agenda:', err.message);
    res.status(500).json({ erro: 'Falha ao carregar agenda.' });
  }
});

// POST /api/agenda — cria slot (auto-cadastra cliente se necessário)
router.post('/', async (req, res) => {
  try {
    const { horario, cliente_nome, servico, telefone, profissional_id, cliente_id, data } = req.body;
    if (!horario) return res.status(400).json({ erro: 'Horário é obrigatório.' });

    const dataSlot = data || new Date().toLocaleString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 10);
    if (!isValidDate(dataSlot)) return res.status(400).json({ erro: 'Data inválida. Use formato YYYY-MM-DD.' });

    // 1. Validar se o horário é no passado (se for hoje)
    const hojeIso = new Date().toLocaleString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 10);
    if (dataSlot === hojeIso) {
      const brTimeString = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
      // Converter para minutos para comparação correta
      const [hAgendar, mAgendar] = horario.split(':').map(Number);
      const [hAtual, mAtual] = brTimeString.split(':').map(Number);
      const minAgendar = hAgendar * 60 + (mAgendar || 0);
      const minAtual = hAtual * 60 + mAtual;
      if (minAgendar < minAtual) {
        return res.status(400).json({ erro: 'Não é possível agendar um horário no passado.' });
      }
    }

    if (!profissional_id) return res.status(400).json({ erro: 'Profissional é obrigatório.' });

    // 2. Check se o PROFISSIONAL já está ocupado neste horário
    const existeProf = await pool.query(
      `SELECT id FROM agenda WHERE usuario_id = $1 AND profissional_id = $2 AND data = $3 AND horario = $4 AND status != 'Cancelado'`,
      [req.usuarioId, profissional_id, dataSlot, horario]
    );
    if (existeProf.rows.length > 0) {
      return res.status(409).json({ erro: 'O profissional já possui uma consulta neste horário.' });
    }

    // ── Auto-cadastro de cliente ──────────────────────────────────────
    let finalClienteId = cliente_id || null;
    let autoCadastrado = false;

    if (!finalClienteId && cliente_nome) {
      // Try to find existing client by phone
      if (telefone) {
        const found = await pool.query(
          'SELECT id FROM clientes WHERE usuario_id = $1 AND telefone = $2 LIMIT 1',
          [req.usuarioId, telefone]
        );
        if (found.rows.length > 0) {
          finalClienteId = found.rows[0].id;
        }
      }

      // If still not found, create new client
      if (!finalClienteId) {
        const novo = await pool.query(
          `INSERT INTO clientes (nome, telefone, usuario_id)
           VALUES ($1, $2, $3) RETURNING id`,
          [cliente_nome, telefone || '', req.usuarioId]
        );
        finalClienteId = novo.rows[0].id;
        autoCadastrado = true;
      }
    }

    // 3. Check se O PACIENTE já tem consulta neste DIA (evitar duplo agendamento no mesmo dia)
    if (finalClienteId) {
      const existeCliente = await pool.query(
        `SELECT id FROM agenda WHERE usuario_id = $1 AND cliente_id = $2 AND data = $3 AND status != 'Cancelado'`,
        [req.usuarioId, finalClienteId, dataSlot]
      );
      if (existeCliente.rows.length > 0) {
        return res.status(409).json({ erro: 'O paciente já possui uma consulta agendada para este dia.' });
      }
    }

    const result = await pool.query(
      `INSERT INTO agenda (data, horario, cliente_nome, servico, telefone, profissional_id, cliente_id, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [dataSlot, horario, cliente_nome || '', servico || '', formatPhoneBR(telefone), profissional_id || null, finalClienteId, req.usuarioId]
    );
    res.status(201).json({ sucesso: true, slot: result.rows[0], auto_cadastrado: autoCadastrado });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'uk_agenda_concorrencia') {
      return res.status(409).json({ erro: 'Este horário acabou de ser reservado por outra pessoa simultaneamente. Atualize a página.' });
    }
    console.error('Erro criar slot:', err.message);
    res.status(500).json({ erro: 'Falha ao criar slot.' });
  }
});

// GET /api/agenda/status — (aceita ?data=YYYY-MM-DD)
router.get('/status', async (req, res) => {
  try {
    const dataParam = req.query.data || new Date().toLocaleString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 10);
    if (!isValidDate(dataParam)) return res.status(400).json({ erro: 'Data inválida. Use formato YYYY-MM-DD.' });

    // Auto-timeout
    if (dataParam === new Date().toLocaleString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 10)) {
      const expiredSlots = await pool.query(
        `SELECT id, horario, servico FROM agenda WHERE usuario_id = $1 AND data = $2 AND status = 'Aguardando Cliente' AND recuperacao_expira_em < current_timestamp`,
        [req.usuarioId, dataParam]
      );
      for (const slot of expiredSlots.rows) {
        const hStr = typeof slot.horario === 'string' ? slot.horario.substring(0,5) : slot.horario.toString().substring(0,5);
        await processarProximoFila(slot.id, req.usuarioId, hStr, slot.servico);
      }
    }
    const agenda = await pool.query(
      `SELECT a.*, p.nome AS profissional_nome, p.especialidade
       FROM agenda a
       LEFT JOIN profissionais p ON a.profissional_id = p.id
       WHERE a.usuario_id = $1 AND a.data = $2
       ORDER BY a.horario`,
      [req.usuarioId, dataParam]
    );

    // Clientes agendados no futuro elegíveis para serem adiantados
    const fila = await pool.query(
      `SELECT DISTINCT c.* 
       FROM agenda a 
       JOIN clientes c ON a.cliente_id = c.id 
       WHERE a.usuario_id = $1 
         AND a.data > CURRENT_DATE 
         AND a.status = 'Agendado'
         AND c.id NOT IN (
           SELECT cliente_id FROM agenda 
           WHERE usuario_id = $1 AND data = CURRENT_DATE 
           AND status = 'Aguardando Cliente' AND cliente_id IS NOT NULL
         )
         AND c.id NOT IN (
           SELECT cliente_id FROM agenda 
           WHERE usuario_id = $1 AND data = CURRENT_DATE 
           AND status IN ('Agendado', 'Realizado') AND cliente_id IS NOT NULL
         )`,
      [req.usuarioId]
    );

    res.json({ sucesso: true, data: dataParam, agenda: agenda.rows, fila: fila.rows });
  } catch (err) {
    console.error('Erro status:', err.message);
    res.status(500).json({ erro: 'Falha ao carregar status.' });
  }
});

// POST /api/agenda/cancelar
router.post('/cancelar', async (req, res) => {
  try {
    const { id, tom } = req.body;
    if (!id) return res.status(400).json({ erro: 'Campo "id" obrigatório.' });

    // Buscar o slot
    const slotResult = await pool.query(
      'SELECT * FROM agenda WHERE id = $1 AND usuario_id = $2',
      [id, req.usuarioId]
    );
    if (slotResult.rows.length === 0) {
      return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    }
    const cancelado = slotResult.rows[0];
    const horarioStr = typeof cancelado.horario === 'string'
      ? cancelado.horario.substring(0, 5)
      : cancelado.horario.toString().substring(0, 5);

    // Marcar como cancelado inicialmente
    await pool.query('UPDATE agenda SET status = $1, recuperacao_expira_em = NULL WHERE id = $2', ['Cancelado', id]);

    const recuperacao = await processarProximoFila(id, req.usuarioId, horarioStr, cancelado.servico, tom);
// Re-fetch agenda atualizada is done below...

    // Re-fetch agenda atualizada
    const agendaAtualizada = await pool.query(
      `SELECT a.*, p.nome AS profissional_nome FROM agenda a
       LEFT JOIN profissionais p ON a.profissional_id = p.id
       WHERE a.usuario_id = $1 AND a.data = CURRENT_DATE ORDER BY a.horario`,
      [req.usuarioId]
    );

    const filaAtualizada = await pool.query(
      `SELECT fe.id AS fila_id, c.* FROM fila_espera fe
       JOIN clientes c ON fe.cliente_id = c.id
       WHERE fe.usuario_id = $1 ORDER BY fe.posicao`,
      [req.usuarioId]
    );

    res.json({
      sucesso: true,
      cancelado: {
        cliente: cancelado.cliente_nome,
        horario: horarioStr,
        servico: cancelado.servico,
        profissional: cancelado.profissional_nome || '',
      },
      recuperacao,
      agenda: agendaAtualizada.rows,
      fila: filaAtualizada.rows,
    });
  } catch (err) {
    console.error('Erro ao cancelar:', err.message);
    res.status(500).json({ erro: 'Falha ao processar cancelamento.' });
  }
});

// GET /api/agenda/regenerar
router.get('/regenerar', async (req, res) => {
  try {
    const { nome, horario, servico, tom } = req.query;
    if (!nome || !horario || !servico) {
      return res.status(400).json({ erro: 'Parâmetros: nome, horario, servico.' });
    }

    const clinicaNome = await getClinicaNome(req.usuarioId);
    const waNum = await getWhatsAppNumero(req.usuarioId);
    const variacoes = gerarVariacoes(nome, horario, servico, clinicaNome);

    if (tom && TONS.includes(tom)) {
      const msg = variacoes[tom];
      return res.json({
        tipo_variacao: tom,
        mensagem_texto: msg,
        whatsapp_url: deepLink(waNum, msg),
        todas_variacoes: variacoes,
      });
    }

    const auto = tomAutomatico(variacoes, horario);
    res.json({
      tipo_variacao: auto.tipo,
      mensagem_texto: auto.mensagem,
      whatsapp_url: deepLink(waNum, auto.mensagem),
      todas_variacoes: variacoes,
    });
  } catch (err) {
    console.error('Erro ao regenerar script:', err.message);
    res.status(500).json({ erro: 'Falha ao processar.' });
  }
});

// POST /api/agenda/confirmar
router.post('/confirmar', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ erro: 'Campo "id" obrigatório.' });

    await pool.query(
      'UPDATE agenda SET status = $1 WHERE id = $2 AND usuario_id = $3',
      ['Aguardando Cliente', id, req.usuarioId]
    );

    res.json({ sucesso: true, mensagem: 'Status atualizado para "Aguardando Cliente".' });
  } catch (err) {
    console.error('Erro confirmar:', err.message);
    res.status(500).json({ erro: 'Falha ao confirmar envio.' });
  }
});
// POST /api/agenda/finalizar
router.post('/finalizar', async (req, res) => {
  try {
    const { id, status, valor, servico_final } = req.body;
    if (!id || !status) return res.status(400).json({ erro: 'ID e status são obrigatórios.' });

    if (!['Realizado', 'Faltou'].includes(status)) {
      return res.status(400).json({ erro: 'Status inválido.' });
    }

    const vNum = parseFloat(valor) || 0;

    const curr = await pool.query('SELECT * FROM agenda WHERE id = $1 AND usuario_id = $2', [id, req.usuarioId]);
    if (curr.rows.length === 0) return res.status(404).json({ erro: 'Consulta não encontrada.' });
    const slot = curr.rows[0];

    const sFinal = servico_final ? servico_final.substring(0, 150) : slot.servico;

    const result = await pool.query(
      'UPDATE agenda SET status = $1, valor = $2, servico = $3 WHERE id = $4 RETURNING *',
      [status, vNum, sFinal, id]
    );

    if (status === 'Realizado' && slot.cliente_id) {
      await pool.query(
        'INSERT INTO historico_consultas (cliente_id, data, servico) VALUES ($1, $2, $3)',
        [slot.cliente_id, slot.data, sFinal || 'Não informado']
      );
    }

    res.json({ sucesso: true, agenda: result.rows[0] });
  } catch (err) {
    console.error('Erro finalizar:', err.message);
    res.status(500).json({ erro: 'Falha ao atualizar status da consulta.' });
  }
});

// GET /api/agenda/tons
router.get('/tons', (_req, res) => {
  res.json({ tons: TONS });
});

// ═══════════ FILA DE ESPERA (TABELA) ═══════════

// GET /api/agenda/fila - Listar fila de espera
router.get('/fila', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fe.*, c.nome, c.telefone, c.cpf 
       FROM fila_espera fe 
       JOIN clientes c ON fe.cliente_id = c.id 
       WHERE fe.usuario_id = $1 
       ORDER BY fe.posicao ASC`,
      [req.usuarioId]
    );
    res.json({ sucesso: true, fila: result.rows });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao carregar fila de espera.' });
  }
});

// POST /api/agenda/fila - Adicionar paciente à fila
router.post('/fila', async (req, res) => {
  try {
    const { cliente_id } = req.body;
    if (!cliente_id) return res.status(400).json({ erro: 'cliente_id é obrigatório.' });

    // Pega a última posição
    const posRes = await pool.query('SELECT COALESCE(MAX(posicao), 0) as max_pos FROM fila_espera WHERE usuario_id = $1', [req.usuarioId]);
    const novaPos = posRes.rows[0].max_pos + 1;

    await pool.query(
      'INSERT INTO fila_espera (cliente_id, usuario_id, posicao) VALUES ($1, $2, $3)',
      [cliente_id, req.usuarioId, novaPos]
    );
    res.json({ sucesso: true, mensagem: 'Paciente adicionado à fila de espera!' });
  } catch (err) {
    console.error('Erro na fila:', err);
    res.status(500).json({ erro: 'Erro ao adicionar à fila.' });
  }
});

// DELETE /api/agenda/fila/:id - Remover da fila
router.delete('/fila/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM fila_espera WHERE id = $1 AND usuario_id = $2', [req.params.id, req.usuarioId]);
    res.json({ sucesso: true, mensagem: 'Removido da fila.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover da fila.' });
  }
});

// ═══════════ FUNÇÃO AUXILIAR DA FILA ═══════════
async function processarProximoFila(slotId, usuarioId, horarioStr, servicoStr, tomPreferido = null) {
  // Puxar apenas da tabela fila_espera (FUTUROS IGNORADOS por pedido do usuário)
  const fila = await pool.query(
    `SELECT fe.id as fila_id, c.* 
     FROM fila_espera fe 
     JOIN clientes c ON fe.cliente_id = c.id 
     WHERE fe.usuario_id = $1 
     ORDER BY fe.posicao ASC`,
    [usuarioId]
  );

  if (fila.rows.length === 0) {
    await pool.query(`UPDATE agenda SET status = 'Cancelado', recuperacao_expira_em = NULL WHERE id = $1`, [slotId]);
    return null;
  }

  const filaComHistorico = await Promise.all(fila.rows.map(async (c) => {
    const hist = await pool.query('SELECT data, servico FROM historico_consultas WHERE cliente_id = $1', [c.id]);
    return { ...c, historico: hist.rows };
  }));

  // scoring (continua igual para achar o mais adequado da FILA)
  const resultado = selecionarMelhor(filaComHistorico, horarioStr, servicoStr);
  if (!resultado || !resultado.cliente) {
    await pool.query(`UPDATE agenda SET status = 'Cancelado', recuperacao_expira_em = NULL WHERE id = $1`, [slotId]);
    return null;
  }
  const escolhido = resultado.cliente;

  await pool.query(
    `UPDATE agenda SET status = 'Aguardando Cliente', cliente_nome = $1, telefone = $2, cliente_id = $3, recuperacao_expira_em = current_timestamp + interval '10 minutes' WHERE id = $4`,
    [escolhido.nome, escolhido.telefone, escolhido.id, slotId]
  );

  // Se o paciente da fila aceitar ou for processado, podemos querer removê-lo da fila_espera depois.
  // Mas por enquanto, apenas marcamos no log ou deixamos para a resposta-recuperacao remover.

  const waNum = await getWhatsAppNumero(usuarioId);
  if (!waNum) throw new Error('WhatsApp não configurado.');

  const clinicaNome = await getClinicaNome(usuarioId);
  const variacoes = gerarVariacoes(escolhido.nome, horarioStr, servicoStr, clinicaNome);

  let tipoVariacao, mensagemTexto;
  if (tomPreferido && TONS.includes(tomPreferido)) {
    tipoVariacao = tomPreferido; mensagemTexto = variacoes[tomPreferido];
  } else {
    const auto = tomAutomatico(variacoes, horarioStr);
    tipoVariacao = auto.tipo; mensagemTexto = auto.mensagem;
  }

  return {
    cliente_id: escolhido.id,
    nome: escolhido.nome,
    telefone: escolhido.telefone,
    mensagem_texto: mensagemTexto,
    whatsapp_url: deepLink(waNum, mensagemTexto),
    tipo_variacao: tipoVariacao,
    todas_variacoes: variacoes
  };
}

// POST /api/agenda/resposta-recuperacao
router.post('/resposta-recuperacao', async (req, res) => {
  try {
    const { id, resposta } = req.body;
    if (!id || !resposta) return res.status(400).json({ erro: 'Id e resposta são obrigatórios' });

    const check = await pool.query('SELECT horario, servico, status, cliente_id FROM agenda WHERE id = $1 AND usuario_id = $2', [id, req.usuarioId]);
    if (check.rows.length === 0) return res.status(404).json({ erro: 'Consulta não encontrada' });
    const slot = check.rows[0];

    if (resposta === 'Aceitou') {
      await pool.query(`UPDATE agenda SET status = 'Agendado', recuperacao_expira_em = NULL WHERE id = $1`, [id]);
      
      // Remove da fila de espera se aceitou
      if (slot.cliente_id) {
         await pool.query('DELETE FROM fila_espera WHERE cliente_id = $1 AND usuario_id = $2', [slot.cliente_id, req.usuarioId]);
      }
      
      return res.json({ sucesso: true, mensagem: 'Consulta mantida e confirmada!' });
    } else {
      const hStr = typeof slot.horario === 'string' ? slot.horario.substring(0,5) : slot.horario.toString().substring(0,5);
      const recup = await processarProximoFila(id, req.usuarioId, hStr, slot.servico);
      return res.json({ sucesso: true, recuperacao: recup });
    }
  } catch (err) {
    console.error('Erro na resposta:', err.message);
    res.status(500).json({ erro: 'Falha ao processar resposta da fila.' });
  }
});

module.exports = router;
