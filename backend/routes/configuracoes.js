const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/configuracoes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM configuracoes WHERE usuario_id = $1',
      [req.usuarioId]
    );

    if (result.rows.length === 0) {
      // Criar padrão se não existir
      const created = await pool.query(
        'INSERT INTO configuracoes (usuario_id) VALUES ($1) RETURNING *',
        [req.usuarioId]
      );
      return res.json({ sucesso: true, configuracoes: created.rows[0] });
    }

    res.json({ sucesso: true, configuracoes: result.rows[0] });
  } catch (err) {
    console.error('Erro buscar config:', err.message);
    res.status(500).json({ erro: 'Falha ao carregar configurações.' });
  }
});

// PUT /api/configuracoes
router.put('/', async (req, res) => {
  try {
    const {
      horario_abertura,
      horario_fechamento,
      dias_funcionamento,
      duracao_consulta,
      whatsapp_numero,
      clinica_nome,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO configuracoes (usuario_id, horario_abertura, horario_fechamento, dias_funcionamento, duracao_consulta, whatsapp_numero, clinica_nome)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (usuario_id) DO UPDATE SET
         horario_abertura = COALESCE($2, configuracoes.horario_abertura),
         horario_fechamento = COALESCE($3, configuracoes.horario_fechamento),
         dias_funcionamento = COALESCE($4, configuracoes.dias_funcionamento),
         duracao_consulta = COALESCE($5, configuracoes.duracao_consulta),
         whatsapp_numero = COALESCE($6, configuracoes.whatsapp_numero),
         clinica_nome = COALESCE($7, configuracoes.clinica_nome)
       RETURNING *`,
      [
        req.usuarioId,
        horario_abertura || null,
        horario_fechamento || null,
        dias_funcionamento || null,
        duracao_consulta || null,
        whatsapp_numero || null,
        clinica_nome || null,
      ]
    );

    res.json({ sucesso: true, configuracoes: result.rows[0] });
  } catch (err) {
    console.error('Erro salvar config:', err.message);
    res.status(500).json({ erro: 'Falha ao salvar configurações.' });
  }
});

module.exports = router;
