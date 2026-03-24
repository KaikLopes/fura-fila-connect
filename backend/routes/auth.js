const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const autenticar = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Limite de 10 tentativas por IP
  message: { erro: 'Muitas tentativas de acesso detectadas. Por segurança, aguarde 15 minutos.' }
});

const router = express.Router();

// ─── POST /api/auth/registrar ───────────────────────────────────────
router.post('/registrar', authLimiter, async (req, res) => {
  try {
    const { clinica_nome, email, cnpj, senha } = req.body;

    if (!clinica_nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome da clínica, email e senha são obrigatórios.' });
    }

    // Verificar email duplicado
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ erro: 'Este email já está cadastrado.' });
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      'INSERT INTO usuarios (clinica_nome, nome, email, cnpj, senha_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id, clinica_nome, email, cnpj',
      [clinica_nome, clinica_nome, email, cnpj || '', senha_hash]
    );

    const novoUsuario = result.rows[0];

    // Criar configurações padrão para a clínica
    await pool.query(
      'INSERT INTO configuracoes (usuario_id, clinica_nome) VALUES ($1, $2)',
      [novoUsuario.id, clinica_nome || '']
    );

    const token = jwt.sign(
      { id: novoUsuario.id, email: novoUsuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({ sucesso: true, token, usuario: novoUsuario });
  } catch (err) {
    console.error('Erro ao registrar:', err.message);
    res.status(500).json({ erro: 'Falha ao registrar usuário.' });
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Campos obrigatórios: email, senha.' });
    }

    const result = await pool.query(
      'SELECT id, clinica_nome, email, cnpj, senha_hash FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    }

    const usuario = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const { id, clinica_nome, email: userEmail, cnpj } = usuario;

    res.json({
      sucesso: true,
      token,
      usuario: { id, clinica_nome, email: userEmail, cnpj },
    });
  } catch (err) {
    console.error('Erro ao logar:', err.message);
    res.status(500).json({ erro: 'Falha ao fazer login.' });
  }
});

// ─── GET /api/auth/me ───────────────────────────────────────────────
router.get('/me', autenticar, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, clinica_nome, email, cnpj, criado_em FROM usuarios WHERE id = $1',
      [req.usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    res.json({ sucesso: true, usuario: result.rows[0] });
  } catch (err) {
    console.error('Erro ao buscar perfil:', err.message);
    res.status(500).json({ erro: 'Falha ao carregar perfil.' });
  }
});

// ─── PUT /api/auth/perfil ───────────────────────────────────────────
router.put('/perfil', autenticar, async (req, res) => {
  try {
    const { clinica_nome, email, cnpj } = req.body;
    
    // Verifica se email já existe em outro usuário
    if (email) {
      const emailCheck = await pool.query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, req.usuarioId]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ erro: 'Este email já está em uso.' });
      }
    }

    const result = await pool.query(
      `UPDATE usuarios SET 
         clinica_nome = COALESCE($1, clinica_nome),
         email = COALESCE($2, email),
         cnpj = COALESCE($3, cnpj)
       WHERE id = $4 RETURNING id, clinica_nome, email, cnpj`,
      [clinica_nome, email, cnpj, req.usuarioId]
    );

    // Also update clinica_nome in configuracoes
    if (clinica_nome !== undefined) { // Only update if clinica_nome was provided in the request
      await pool.query(
        'UPDATE configuracoes SET clinica_nome = $1 WHERE usuario_id = $2',
        [clinica_nome || '', req.usuarioId]
      );
    }

    res.json({ sucesso: true, usuario: result.rows[0] });
  } catch (err) {
    console.error('Erro atualizar perfil:', err.message);
    res.status(500).json({ erro: 'Falha ao atualizar perfil.' });
  }
});

// ─── PUT /api/auth/senha ────────────────────────────────────────────
router.put('/senha', autenticar, async (req, res) => {
  try {
    const { senha_atual, nova_senha } = req.body;
    if (!senha_atual || !nova_senha) {
      return res.status(400).json({ erro: 'Senha atual e nova senha são obrigatórias.' });
    }
    if (nova_senha.length < 6) {
      return res.status(400).json({ erro: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    const result = await pool.query('SELECT senha_hash FROM usuarios WHERE id = $1', [req.usuarioId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const senhaValida = await bcrypt.compare(senha_atual, result.rows[0].senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Senha atual incorreta.' });
    }

    const nova_hash = await bcrypt.hash(nova_senha, 10);
    await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [nova_hash, req.usuarioId]);

    res.json({ sucesso: true, mensagem: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error('Erro alterar senha:', err.message);
    res.status(500).json({ erro: 'Falha ao alterar senha.' });
  }
});

module.exports = router;
