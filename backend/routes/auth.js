const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const autenticar = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { createTokenPair, refreshAccessToken, revokeRefreshToken, revokeAllUserTokens } = require('../utils/tokens');
const { enviarEmail, gerarCorpoEmailConfirmacao, gerarCorpoEmailReset } = require('../utils/email');
const { gerarCodigo, salvarCodigo, validarCodigo, marcarCodigoUsado } = require('../utils/codigos');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { erro: 'Muitas tentativas de acesso. Por segurança, aguarde 15 minutos.' }
});

const router = express.Router();

// Helper para definir cookie com atributos de segurança (Ajustado para Cross-Domain)
function setRefreshTokenCookie(res, token, expiresAt) {
  const expires = new Date(expiresAt);
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProduction, 
    sameSite: isProduction ? 'none' : 'strict',
    path: '/',
    expires: expires
  });
}

function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', { path: '/' });
}

// POST /api/auth/registrar
router.post('/registrar', authLimiter, async (req, res) => {
  try {
    const { clinica_nome, email, cnpj, senha } = req.body;

    if (!clinica_nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome da clínica, email e senha são obrigatórios.' });
    }

    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ erro: 'Este email já está cadastrado.' });
    }

    const senha_hash = await bcrypt.hash(senha, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (clinica_nome, nome, email, cnpj, senha_hash, email_confirmado) VALUES ($1, $2, $3, $4, $5, false) RETURNING id',
      [clinica_nome, clinica_nome, email, cnpj || '', senha_hash]
    );

    await pool.query('INSERT INTO configuracoes (usuario_id, clinica_nome) VALUES ($1, $2)', [result.rows[0].id, clinica_nome]);

    const codigo = gerarCodigo();
    await salvarCodigo(result.rows[0].id, codigo, 'confirmacao');

    enviarEmail({
      para: email,
      assunto: 'Confirme seu email - FuraFila Connect',
      html: gerarCorpoEmailConfirmacao(codigo),
    }).catch(err => console.error('Erro envio email:', err.message));

    res.status(201).json({ sucesso: true, mensagem: 'Cadastro realizado. Verifique seu email.' });
  } catch (err) {
    res.status(500).json({ erro: 'Falha ao registrar usuário.' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'Email e senha obrigatórios.' });

    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ erro: 'Email ou senha incorretos.' });

    const usuario = result.rows[0];
    if (!usuario.email_confirmado) return res.status(403).json({ erro: 'Email não confirmado.' });

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) return res.status(401).json({ erro: 'Email ou senha incorretos.' });

    const tokens = await createTokenPair(usuario.id, usuario.email);
    setRefreshTokenCookie(res, tokens.refreshToken, tokens.expiresAt);

    res.json({
      sucesso: true,
      token: tokens.accessToken,
      usuario: { id: usuario.id, clinica_nome: usuario.clinica_nome, email: usuario.email }
    });
  } catch (err) {
    res.status(500).json({ erro: 'Falha ao fazer login.' });
  }
});

// GET /api/auth/me
router.get('/me', autenticar, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, clinica_nome, email, cnpj, criado_em FROM usuarios WHERE id = $1', [req.usuarioId]);
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json({ sucesso: true, usuario: result.rows[0] });
  } catch (err) {
    res.status(500).json({ erro: 'Falha ao carregar perfil.' });
  }
});

// PUT /api/auth/perfil
router.put('/perfil', autenticar, async (req, res) => {
  try {
    const { clinica_nome, email, cnpj } = req.body;
    const result = await pool.query(
      'UPDATE usuarios SET clinica_nome = COALESCE($1, clinica_nome), email = COALESCE($2, email), cnpj = COALESCE($3, cnpj) WHERE id = $4 RETURNING id, clinica_nome, email, cnpj',
      [clinica_nome, email, cnpj, req.usuarioId]
    );
    res.json({ sucesso: true, usuario: result.rows[0] });
  } catch (err) {
    res.status(500).json({ erro: 'Falha ao atualizar perfil.' });
  }
});

// PUT /api/auth/senha
router.put('/senha', autenticar, async (req, res) => {
  try {
    const { senha_atual, nova_senha } = req.body;
    const result = await pool.query('SELECT senha_hash FROM usuarios WHERE id = $1', [req.usuarioId]);
    const senhaValida = await bcrypt.compare(senha_atual, result.rows[0].senha_hash);
    if (!senhaValida) return res.status(401).json({ erro: 'Senha atual incorreta.' });

    const nova_hash = await bcrypt.hash(nova_senha, 10);
    await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [nova_hash, req.usuarioId]);
    res.json({ sucesso: true, mensagem: 'Senha alterada.' });
  } catch (err) {
    res.status(500).json({ erro: 'Falha ao alterar senha.' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const newTokens = await refreshAccessToken(refreshToken);
    if (!newTokens) return res.status(401).json({ erro: 'Sessão expirada.' });
    res.json({ sucesso: true, token: newTokens.accessToken, expiresAt: newTokens.expiresAt });
  } catch (err) {
    res.status(500).json({ erro: 'Falha ao renovar sessão.' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await revokeRefreshToken(refreshToken);
    clearRefreshTokenCookie(res);
    res.json({ sucesso: true, mensagem: 'Logout realizado.' });
  } catch (err) {
    res.status(500).json({ erro: 'Falha ao fazer logout.' });
  }
});

// POST /api/auth/enviar-codigo
router.post('/enviar-codigo', authLimiter, async (req, res) => {
  try {
    const { email, tipo } = req.body;
    const result = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      const codigo = gerarCodigo();
      await salvarCodigo(result.rows[0].id, codigo, tipo);
      const html = tipo === 'confirmacao' ? gerarCorpoEmailConfirmacao(codigo) : gerarCorpoEmailReset(codigo);
      enviarEmail({ para: email, assunto: 'Código FuraFila', html }).catch(() => {});
    }
    res.json({ sucesso: true, mensagem: 'Se o email existir, enviamos o código.' });
  } catch (err) {
    res.status(500).json({ erro: 'Falha ao processar.' });
  }
});

// POST /api/auth/verificar-codigo
router.post('/verificar-codigo', authLimiter, async (req, res) => {
  try {
    const { email, codigo, tipo } = req.body;
    const usuarioId = await validarCodigo(email, codigo, tipo);
    if (!usuarioId) return res.status(400).json({ erro: 'Código inválido.' });

    if (tipo === 'confirmacao') {
      await pool.query('UPDATE usuarios SET email_confirmado = true WHERE id = $1', [usuarioId]);
      await marcarCodigoUsado(usuarioId, 'confirmacao');
      const tokens = await createTokenPair(usuarioId, email);
      setRefreshTokenCookie(res, tokens.refreshToken, tokens.expiresAt);
      res.json({ sucesso: true, token: tokens.accessToken, usuario: { id: usuarioId, email } });
    } else {
      res.json({ sucesso: true, pendente: true });
    }
  } catch (err) {
    res.status(500).json({ erro: 'Falha ao verificar.' });
  }
});

// POST /api/auth/resetar-senha
router.post('/resetar-senha', authLimiter, async (req, res) => {
  try {
    const { email, codigo, nova_senha } = req.body;
    const usuarioId = await validarCodigo(email, codigo, 'reset');
    if (!usuarioId) return res.status(400).json({ erro: 'Código inválido.' });

    const senha_hash = await bcrypt.hash(nova_senha, 10);
    await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [senha_hash, usuarioId]);
    await marcarCodigoUsado(usuarioId, 'reset');
    await revokeAllUserTokens(usuarioId);
    res.json({ sucesso: true, mensagem: 'Senha redefinida.' });
  } catch (err) {
    res.status(500).json({ erro: 'Falha ao resetar.' });
  }
});

module.exports = router;