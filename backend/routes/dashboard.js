const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const uid = req.usuarioId;

    // ── Consultas do dia ──
    const consultasHoje = await pool.query(
      `SELECT COUNT(*) AS total FROM agenda WHERE usuario_id = $1 AND data = CURRENT_DATE AND status != 'Cancelado'`,
      [uid]
    );

    // Consultas confirmadas hoje
    const confirmadas = await pool.query(
      `SELECT COUNT(*) AS total FROM agenda WHERE usuario_id = $1 AND data = CURRENT_DATE AND status = 'Confirmado'`,
      [uid]
    );

    // Consultas pendentes hoje (Agendado)
    const pendentes = await pool.query(
      `SELECT COUNT(*) AS total FROM agenda WHERE usuario_id = $1 AND data = CURRENT_DATE AND status = 'Agendado'`,
      [uid]
    );

    // Cancelamentos hoje
    const cancelamentos = await pool.query(
      `SELECT COUNT(*) AS total FROM agenda WHERE usuario_id = $1 AND data = CURRENT_DATE AND status = 'Cancelado'`,
      [uid]
    );

    // Vagas recuperadas hoje (Aguardando Cliente + Realizadas hoje)
    const recuperadas = await pool.query(
      `SELECT COUNT(*) AS total FROM agenda 
       WHERE usuario_id = $1 AND data = CURRENT_DATE 
       AND status IN ('Realizado', 'Confirmado', 'Aguardando Cliente')`,
      [uid]
    );

    // ── Horários disponíveis hoje ──
    const config = await pool.query(
      `SELECT horario_abertura, horario_fechamento, duracao_consulta, dias_funcionamento
       FROM configuracoes WHERE usuario_id = $1`,
      [uid]
    );
    let horariosDisponiveis = 0;
    if (config.rows.length > 0) {
      const { horario_abertura, horario_fechamento, duracao_consulta } = config.rows[0];
      const [ha, ma] = (horario_abertura || '08:00').split(':').map(Number);
      const [hf, mf] = (horario_fechamento || '18:00').split(':').map(Number);
      const dur = parseInt(duracao_consulta) || 30;
      const aMin = ha * 60 + ma;
      const fMin = hf * 60 + mf;
      const totalSlotsPossiveis = Math.floor((fMin - aMin) / dur);

      const ocupados = await pool.query(
        `SELECT COUNT(*) AS total FROM agenda WHERE usuario_id = $1 AND data = CURRENT_DATE AND status != 'Cancelado'`,
        [uid]
      );
      horariosDisponiveis = Math.max(0, totalSlotsPossiveis - parseInt(ocupados.rows[0].total));
    }

    // ── Total pacientes ──
    const totalPacientes = await pool.query(
      'SELECT COUNT(*) AS total FROM clientes WHERE usuario_id = $1',
      [uid]
    );

    // ── Total profissionais ──
    const totalProfs = await pool.query(
      'SELECT COUNT(*) AS total FROM profissionais WHERE usuario_id = $1',
      [uid]
    );

    // ── Fila atual ──
    const filaAtual = await pool.query(
      'SELECT COUNT(*) AS total FROM fila_espera WHERE usuario_id = $1',
      [uid]
    );

    // ── Consultas esta semana ──
    const consultasSemana = await pool.query(
      `SELECT COUNT(*) AS total FROM agenda
       WHERE usuario_id = $1 AND data >= date_trunc('week', CURRENT_DATE) AND data < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
       AND status != 'Cancelado'`,
      [uid]
    );

    // ── Próximo horário vago ──
    const proximoVago = await pool.query(
      `SELECT horario FROM agenda
       WHERE usuario_id = $1 AND data = CURRENT_DATE AND status = 'Cancelado'
       ORDER BY horario LIMIT 1`,
      [uid]
    );

    // ── Taxa de recuperação ──
    // Consideramos recuperadas as consultas que voltaram para 'Agendado' ou 'Realizado' após terem sido slots de cancelamento (id_origem_cancelamento ou similar seria ideal, mas usaremos status por ora)
    const cancelHoje = parseInt(cancelamentos.rows[0].total);
    const recupHoje = await pool.query(
      `SELECT COUNT(*) as total FROM agenda 
       WHERE usuario_id = $1 AND data = CURRENT_DATE AND (status = 'Realizado' OR status = 'Agendado')
       AND id IN (SELECT id FROM agenda WHERE status != 'Cancelado')`, // Lógica simplificada
       [uid]
    );
    const nRecup = parseInt(recupHoje.rows[0].total);
    const taxa = cancelHoje > 0 ? ((nRecup / (cancelHoje + nRecup)) * 100).toFixed(1) : 0;

    // ── Profissional com mais cancelamentos (mês) ──
    const profTop = await pool.query(
      `SELECT p.nome, COUNT(*) AS cancelamentos
       FROM agenda a
       JOIN profissionais p ON a.profissional_id = p.id
       WHERE a.usuario_id = $1 AND a.status IN ('Cancelado', 'Em Recuperação', 'Aguardando Cliente')
         AND a.data >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY p.nome
       ORDER BY cancelamentos DESC LIMIT 1`,
      [uid]
    );

    // ── Próximas consultas do dia ──
    const proximas = await pool.query(
      `SELECT a.horario, a.cliente_nome, a.servico, a.status,
              p.nome AS profissional_nome
       FROM agenda a
       LEFT JOIN profissionais p ON a.profissional_id = p.id
       WHERE a.usuario_id = $1 AND a.data = CURRENT_DATE AND a.status != 'Cancelado'
       ORDER BY a.horario LIMIT 5`,
      [uid]
    );

    // ── Faturamento do dia ──
    const faturamento = await pool.query(
      `SELECT SUM(valor) AS total FROM agenda WHERE usuario_id = $1 AND data = CURRENT_DATE AND status = 'Realizado'`,
      [uid]
    );

    // ── Ranking de Serviços ──
    const topServicos = await pool.query(
      `SELECT servico, p.nome AS profissional, COUNT(*) as qtd
       FROM agenda a
       LEFT JOIN profissionais p ON a.profissional_id = p.id
       WHERE a.usuario_id = $1 AND a.status IN ('Realizado', 'Confirmado')
       GROUP BY servico, p.nome
       ORDER BY qtd DESC
       LIMIT 3`,
       [uid]
    );

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
    console.error('Erro dashboard:', err.message);
    res.status(500).json({ erro: 'Falha ao carregar dashboard.' });
  }
});

module.exports = router;
