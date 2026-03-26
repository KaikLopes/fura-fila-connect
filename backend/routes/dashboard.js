const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/dashboard/simple - Versão rápida
router.get('/simple', async (req, res) => {
  try {
    const uid = req.usuarioId;
    console.log(`[DASHBOARD] Simple: ${uid}`);
    
    // Apenas 1 query bem rápida
    const result = await pool.query(
      `SELECT 
        COUNT(*) as consultas
       FROM agenda 
       WHERE usuario_id = $1 AND data = CURRENT_DATE AND status != 'Cancelado'`,
      [uid]
    );

    res.json({
      sucesso: true,
      dashboard: {
        consultas_hoje: parseInt(result.rows[0].consultas),
        confirmadas_hoje: 0,
        pendentes_hoje: 0,
        cancelamentos_hoje: 0,
        vagas_recuperadas: 0,
        taxa_recuperacao: 0,
        horarios_disponiveis: 0,
        total_pacientes: 0,
        total_profissionais: 0,
        fila_atual: 0,
        consultas_semana: 0,
        proximo_horario_vago: null,
        profissional_top_cancelamentos: '—',
        proximas_consultas: [],
        faturamento_hoje: 0,
        ranking_servicos: [],
      },
    });
  } catch (err) {
    console.error('[DASHBOARD] Erro:', err.message);
    res.status(500).json({ erro: 'Falha ao carregar dashboard.' });
  }
});

// GET /api/dashboard - Versão completa
router.get('/', async (req, res) => {
  try {
    const uid = req.usuarioId;
    console.log(`[DASHBOARD] Requisição iniciada para usuário ${uid}`);

    // Executar todas as queries em paralelo com Promise.all
    const [
      consultasHoje,
      confirmadas,
      pendentes,
      cancelamentos,
      recuperadas,
      config,
      totalPacientes,
      totalProfs,
      filaAtual,
      consultasSemana,
      proximoVago,
      recupHoje,
      profTop,
      proximas,
      faturamento,
      topServicos
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total FROM agenda WHERE usuario_id = $1 AND data = CURRENT_DATE AND status != 'Cancelado'`,
        [uid]
      ).catch(e => ({ rows: [{ total: '0' }], error: e })),
      pool.query(
        `SELECT COUNT(*) AS total FROM agenda WHERE usuario_id = $1 AND data = CURRENT_DATE AND status = 'Confirmado'`,
        [uid]
      ).catch(e => ({ rows: [{ total: '0' }], error: e })),
      pool.query(
        `SELECT COUNT(*) AS total FROM agenda WHERE usuario_id = $1 AND data = CURRENT_DATE AND status = 'Agendado'`,
        [uid]
      ).catch(e => ({ rows: [{ total: '0' }], error: e })),
      pool.query(
        `SELECT COUNT(*) AS total FROM agenda WHERE usuario_id = $1 AND data = CURRENT_DATE AND status = 'Cancelado'`,
        [uid]
      ).catch(e => ({ rows: [{ total: '0' }], error: e })),
      pool.query(
        `SELECT COUNT(*) AS total FROM agenda 
         WHERE usuario_id = $1 AND data = CURRENT_DATE 
         AND status IN ('Realizado', 'Confirmado', 'Aguardando Cliente')`,
        [uid]
      ).catch(e => ({ rows: [{ total: '0' }], error: e })),
      pool.query(
        `SELECT horario_abertura, horario_fechamento, duracao_consulta, dias_funcionamento
         FROM configuracoes WHERE usuario_id = $1`,
        [uid]
      ).catch(e => ({ rows: [], error: e })),
      pool.query(
        'SELECT COUNT(*) AS total FROM clientes WHERE usuario_id = $1',
        [uid]
      ).catch(e => ({ rows: [{ total: '0' }], error: e })),
      pool.query(
        'SELECT COUNT(*) AS total FROM profissionais WHERE usuario_id = $1',
        [uid]
      ).catch(e => ({ rows: [{ total: '0' }], error: e })),
      pool.query(
        'SELECT COUNT(*) AS total FROM fila_espera WHERE usuario_id = $1',
        [uid]
      ).catch(e => ({ rows: [{ total: '0' }], error: e })),
      pool.query(
        `SELECT COUNT(*) AS total FROM agenda
         WHERE usuario_id = $1 AND data >= date_trunc('week', CURRENT_DATE) AND data < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
         AND status != 'Cancelado'`,
        [uid]
      ).catch(e => ({ rows: [{ total: '0' }], error: e })),
      pool.query(
        `SELECT horario FROM agenda
         WHERE usuario_id = $1 AND data = CURRENT_DATE AND status = 'Cancelado'
         ORDER BY horario LIMIT 1`,
        [uid]
      ).catch(e => ({ rows: [], error: e })),
      pool.query(
        `SELECT COUNT(*) as total FROM agenda 
         WHERE usuario_id = $1 AND data = CURRENT_DATE AND (status = 'Realizado' OR status = 'Agendado')`,
        [uid]
      ).catch(e => ({ rows: [{ total: '0' }], error: e })),
      pool.query(
        `SELECT p.nome, COUNT(*) AS cancelamentos
         FROM agenda a
         JOIN profissionais p ON a.profissional_id = p.id
         WHERE a.usuario_id = $1 AND a.status IN ('Cancelado', 'Em Recuperação', 'Aguardando Cliente')
           AND a.data >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY p.nome
         ORDER BY cancelamentos DESC LIMIT 1`,
        [uid]
      ).catch(e => ({ rows: [], error: e })),
      pool.query(
        `SELECT a.horario, a.cliente_nome, a.servico, a.status,
                p.nome AS profissional_nome
         FROM agenda a
         LEFT JOIN profissionais p ON a.profissional_id = p.id
         WHERE a.usuario_id = $1 AND a.data = CURRENT_DATE AND a.status != 'Cancelado'
         ORDER BY a.horario LIMIT 5`,
        [uid]
      ).catch(e => ({ rows: [], error: e })),
      pool.query(
        `SELECT SUM(valor) AS total FROM agenda WHERE usuario_id = $1 AND data = CURRENT_DATE AND status = 'Realizado'`,
        [uid]
      ).catch(e => ({ rows: [{ total: null }], error: e })),
      pool.query(
        `SELECT servico, p.nome AS profissional, COUNT(*) as qtd
         FROM agenda a
         LEFT JOIN profissionais p ON a.profissional_id = p.id
         WHERE a.usuario_id = $1 AND a.status IN ('Realizado', 'Confirmado')
         GROUP BY servico, p.nome
         ORDER BY qtd DESC
         LIMIT 3`,
        [uid]
      ).catch(e => ({ rows: [], error: e })),
    ]);

    console.log('[DASHBOARD] Todas as queries completas');

    // Calcular horários disponíveis
    let horariosDisponiveis = 0;
    if (config.rows.length > 0) {
      const { horario_abertura, horario_fechamento, duracao_consulta } = config.rows[0];
      const [ha, ma] = (horario_abertura || '08:00').split(':').map(Number);
      const [hf, mf] = (horario_fechamento || '18:00').split(':').map(Number);
      const dur = parseInt(duracao_consulta) || 30;
      const aMin = ha * 60 + ma;
      const fMin = hf * 60 + mf;
      const totalSlotsPossiveis = Math.floor((fMin - aMin) / dur);
      const ocupados = parseInt(consultasHoje.rows[0].total);
      horariosDisponiveis = Math.max(0, totalSlotsPossiveis - ocupados);
    }

    // Calcular taxa de recuperação
    const cancelHoje = parseInt(cancelamentos.rows[0].total);
    const nRecup = parseInt(recupHoje.rows[0].total);
    const taxa = cancelHoje > 0 ? ((nRecup / (cancelHoje + nRecup)) * 100).toFixed(1) : 0;

    res.json({
      sucesso: true,
      dashboard: {
        consultas_hoje: parseInt(consultasHoje.rows[0].total),
        confirmadas_hoje: parseInt(confirmadas.rows[0].total),
        pendentes_hoje: parseInt(pendentes.rows[0].total),
        cancelamentos_hoje: cancelHoje,
        vagas_recuperadas: nRecup,
        taxa_recuperacao: parseFloat(taxa),
        horarios_disponiveis: horariosDisponiveis,
        total_pacientes: parseInt(totalPacientes.rows[0].total),
        total_profissionais: parseInt(totalProfs.rows[0].total),
        fila_atual: parseInt(filaAtual.rows[0].total),
        consultas_semana: parseInt(consultasSemana.rows[0].total),
        proximo_horario_vago: proximoVago.rows[0]?.horario || null,
        profissional_top_cancelamentos: profTop.rows.length > 0 ? `${profTop.rows[0].nome} (${profTop.rows[0].cancelamentos})` : '—',
        proximas_consultas: proximas.rows,
        faturamento_hoje: parseFloat(faturamento.rows[0]?.total || 0),
        ranking_servicos: topServicos.rows,
      },
    });
  } catch (err) {
    console.error('[DASHBOARD] Erro:', err.message);
    res.status(500).json({ erro: 'Falha ao carregar dashboard.' });
  }
});

module.exports = router;
