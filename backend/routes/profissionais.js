const express = require('express');
const pool = require('../db/pool');
const { formatPhoneBR } = require('../utils/formatters');

const router = express.Router();

// GET /api/profissionais
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM profissionais WHERE usuario_id = $1 ORDER BY nome LIMIT 250',
      [req.usuarioId]
    );
    res.json({ sucesso: true, profissionais: result.rows });
  } catch (err) {
    console.error('Erro listar profissionais:', err.message);
    res.status(500).json({ erro: 'Falha ao listar profissionais.' });
  }
});

// GET /api/profissionais/:id/servicos — serviços de um profissional
router.get('/:id/servicos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT servicos FROM profissionais WHERE id = $1 AND usuario_id = $2',
      [req.params.id, req.usuarioId]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Profissional não encontrado.' });
    res.json({ sucesso: true, servicos: result.rows[0].servicos || [] });
  } catch (err) {
    console.error('Erro servicos:', err.message);
    res.status(500).json({ erro: 'Falha ao buscar serviços.' });
  }
});

// POST /api/profissionais
router.post('/', async (req, res) => {
  try {
    const { nome, especialidade, telefone, dias_atendimento, servicos, crm } = req.body;
    if (!nome || !crm) return res.status(400).json({ erro: 'Nome e CRM são obrigatórios.' });

    // Prevenção de duplicatas por nome
    const checkName = await pool.query('SELECT id FROM profissionais WHERE LOWER(nome) = LOWER($1) AND usuario_id = $2', [nome.trim(), req.usuarioId]);
    if (checkName.rows.length > 0) {
      return res.status(409).json({ erro: 'Já existe um profissional cadastrado com este nome.' });
    }

    // Prevenção de duplicatas por CRM
    const checkCrm = await pool.query('SELECT id FROM profissionais WHERE crm = $1 AND usuario_id = $2', [crm, req.usuarioId]);
    if (checkCrm.rows.length > 0) {
      return res.status(409).json({ erro: 'Já existe um profissional cadastrado com este CRM.' });
    }

    const result = await pool.query(
      `INSERT INTO profissionais (nome, especialidade, telefone, dias_atendimento, servicos, crm, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nome, especialidade || '', formatPhoneBR(telefone), dias_atendimento || [], servicos || [], crm, req.usuarioId]
    );

    res.status(201).json({ sucesso: true, profissional: result.rows[0] });
  } catch (err) {
    console.error('Erro criar profissional:', err.message);
    res.status(500).json({ erro: 'Falha ao cadastrar profissional.' });
  }
});

// PUT /api/profissionais/:id
router.put('/:id', async (req, res) => {
  try {
    const { nome, especialidade, telefone, dias_atendimento, servicos, crm } = req.body;
    
    // Prevenção de duplicatas ao alterar nome
    if (nome) {
      const checkName = await pool.query('SELECT id FROM profissionais WHERE LOWER(nome) = LOWER($1) AND usuario_id = $2 AND id != $3', [nome.trim(), req.usuarioId, req.params.id]);
      if (checkName.rows.length > 0) {
        return res.status(409).json({ erro: 'Já existe um profissional cadastrado com este nome.' });
      }
    }

    // Prevenção de duplicatas ao alterar CRM
    if (crm) {
      const checkCrm = await pool.query('SELECT id FROM profissionais WHERE crm = $1 AND usuario_id = $2 AND id != $3', [crm, req.usuarioId, req.params.id]);
      if (checkCrm.rows.length > 0) {
        return res.status(409).json({ erro: 'Já existe um profissional cadastrado com este CRM.' });
      }
    }

    const result = await pool.query(
      `UPDATE profissionais SET
        nome = COALESCE($1, nome),
        especialidade = COALESCE($2, especialidade),
        telefone = COALESCE($3, telefone),
        dias_atendimento = COALESCE($4, dias_atendimento),
        servicos = COALESCE($5, servicos),
        crm = COALESCE($6, crm)
       WHERE id = $7 AND usuario_id = $8 RETURNING *`,
      [nome, especialidade, formatPhoneBR(telefone), dias_atendimento, servicos, crm, req.params.id, req.usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Profissional não encontrado.' });
    }

    res.json({ sucesso: true, profissional: result.rows[0] });
  } catch (err) {
    console.error('Erro editar profissional:', err.message);
    res.status(500).json({ erro: 'Falha ao editar profissional.' });
  }
});

// DELETE /api/profissionais/:id
router.delete('/:id', async (req, res) => {
  try {
    const profId = parseInt(req.params.id);
    const result = await pool.query(
      'DELETE FROM profissionais WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [profId, req.usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Profissional não encontrado.' });
    }

    res.json({ sucesso: true, mensagem: 'Profissional removido.' });
  } catch (err) {
    console.error('Erro remover profissional:', err.message);
    res.status(500).json({ erro: 'Falha ao remover profissional.' });
  }
});

module.exports = router;
