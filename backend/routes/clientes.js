const express = require('express');
const pool = require('../db/pool');
const { formatPhoneBR } = require('../utils/formatters');

const router = express.Router();

// ─── CAMPOS COMPLETOS ────────────────────────────────────────────────
const CAMPOS = [
  'nome', 'telefone', 'servico_desejado', 'endereco', 'horario_preferido',
  'cpf', 'data_nascimento', 'sexo', 'tipo_sanguineo',
  'alergias', 'observacoes_medicas',
  'contato_emergencia_nome', 'contato_emergencia_tel',
  'responsavel_nome', 'responsavel_cpf', 'responsavel_tel'
];

// GET /api/clientes — lista com histórico (paginação)
// Query params: ?page=1&limit=20
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Query otimizada com JOIN para evitar N+1
    const clientes = await pool.query(
      `SELECT c.*,
        COALESCE(
          json_agg(
            json_build_object('id', h.id, 'data', h.data, 'servico', h.servico)
          ) FILTER (WHERE h.id IS NOT NULL),
          '[]'
        ) as historico_consultas
      FROM clientes c
      LEFT JOIN historico_consultas h ON h.cliente_id = c.id
      WHERE c.usuario_id = $1
      GROUP BY c.id
      ORDER BY c.nome
      LIMIT $2 OFFSET $3`,
      [req.usuarioId, limit, offset]
    );

    // Contar total de clientes
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM clientes WHERE usuario_id = $1',
      [req.usuarioId]
    );
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      sucesso: true,
      clientes: clientes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Erro listar clientes:', err.message);
    res.status(500).json({ erro: 'Falha ao listar clientes.' });
  }
});

// GET /api/clientes/busca?q= — busca por nome, CPF ou telefone
router.get('/busca', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ sucesso: true, clientes: [] });

    // Remove non-numeric chars from query for CPF/Phone matching
    const qClean = q.replace(/\D/g, '');

    const result = await pool.query(
      `SELECT id, nome, telefone, cpf, data_nascimento FROM clientes
       WHERE usuario_id = $1 AND (
         LOWER(nome) LIKE LOWER($2) OR
         ($3 != '' AND regexp_replace(telefone, '\\D', '', 'g') LIKE '%' || $3 || '%') OR
         ($3 != '' AND regexp_replace(cpf, '\\D', '', 'g') LIKE '%' || $3 || '%')
       ) ORDER BY nome LIMIT 10`,
      [req.usuarioId, `%${q}%`, qClean]
    );
    res.json({ sucesso: true, clientes: result.rows });
  } catch (err) {
    console.error('Erro buscar clientes:', err.message);
    res.status(500).json({ erro: 'Falha ao buscar clientes.' });
  }
});

// POST /api/clientes
router.post('/', async (req, res) => {
  try {
    const { nome, telefone, cpf } = req.body;
    if (!nome || !telefone || !cpf) {
      return res.status(400).json({ erro: 'Nome, telefone e CPF são obrigatórios.' });
    }

    // Prevenção de duplicatas CPF
    if (cpf) {
      const checkCpf = await pool.query('SELECT id FROM clientes WHERE regexp_replace(cpf, \'\\D\', \'\', \'g\') = regexp_replace($1, \'\\D\', \'\', \'g\') AND usuario_id = $2', [cpf, req.usuarioId]);
      if (checkCpf.rows.length > 0) {
        return res.status(409).json({ erro: 'Já existe um paciente cadastrado com este CPF.' });
      }
    }

    const vals = CAMPOS.map(c => {
      if (c === 'horario_preferido') return req.body[c] || null;
      if (c === 'data_nascimento') return req.body[c] || null;
      if (c.includes('tel') || c === 'telefone') return formatPhoneBR(req.body[c]);
      return req.body[c] || '';
    });

    const placeholders = CAMPOS.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(
      `INSERT INTO clientes (${CAMPOS.join(', ')}, usuario_id)
       VALUES (${placeholders}, $${CAMPOS.length + 1}) RETURNING *`,
      [...vals, req.usuarioId]
    );

    res.status(201).json({ sucesso: true, cliente: result.rows[0] });
  } catch (err) {
    console.error('Erro criar cliente:', err.message);
    res.status(500).json({ erro: 'Falha ao cadastrar cliente.' });
  }
});

// PUT /api/clientes/:id
router.put('/:id', async (req, res) => {
  try {
    const clienteId = parseInt(req.params.id);
    if (isNaN(clienteId) || clienteId <= 0) {
      return res.status(400).json({ erro: 'ID de cliente inválido.' });
    }
    const { cpf } = req.body;

    // Prevenção de duplicatas CPF
    if (cpf) {
      const checkCpf = await pool.query('SELECT id FROM clientes WHERE regexp_replace(cpf, \'\\D\', \'\', \'g\') = regexp_replace($1, \'\\D\', \'\', \'g\') AND usuario_id = $2 AND id != $3', [cpf, req.usuarioId, clienteId]);
      if (checkCpf.rows.length > 0) {
        return res.status(409).json({ erro: 'Já existe um paciente cadastrado com este CPF.' });
      }
    }

    const sets = CAMPOS.map((c, i) => `${c} = COALESCE($${i + 1}, ${c})`).join(', ');
    const vals = CAMPOS.map(c => {
      if (c === 'horario_preferido' || c === 'data_nascimento') return req.body[c] || null;
      if (c.includes('tel') || c === 'telefone') return formatPhoneBR(req.body[c]);
      return req.body[c] !== undefined ? req.body[c] : null;
    });

    const result = await pool.query(
      `UPDATE clientes SET ${sets}
       WHERE id = $${CAMPOS.length + 1} AND usuario_id = $${CAMPOS.length + 2} RETURNING *`,
      [...vals, clienteId, req.usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }

    res.json({ sucesso: true, cliente: result.rows[0] });
  } catch (err) {
    console.error('Erro editar cliente:', err.message);
    res.status(500).json({ erro: 'Falha ao editar cliente.' });
  }
});

// DELETE /api/clientes/:id
router.delete('/:id', async (req, res) => {
  try {
    const clienteId = parseInt(req.params.id);
    if (isNaN(clienteId) || clienteId <= 0) {
      return res.status(400).json({ erro: 'ID de cliente inválido.' });
    }
    const result = await pool.query(
      'DELETE FROM clientes WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [clienteId, req.usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }

    res.json({ sucesso: true, mensagem: 'Cliente removido.' });
  } catch (err) {
    console.error('Erro remover cliente:', err.message);
    res.status(500).json({ erro: 'Falha ao remover cliente.' });
  }
});

module.exports = router;
