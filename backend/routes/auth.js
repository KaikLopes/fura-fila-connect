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
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Limite de 10 tentativas por IP
  message: { erro: 'Muitas tentativas de acesso detectadas. Por segurança, aguarde 15 minutos.' }
});

const router = express.Router();

// Helper para definir cookie com atributos de segurança
function setRefreshTokenCookie(res, token, expiresAt) {
  const expires = new Date(expiresAt);
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: expires
  });
}

// Helper para limpar cookie de refresh token
function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', { path: '/' });
}

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
      'INSERT INTO usuarios (clinica_nome, nome, email, cnpj, senha_hash, email_confirmado) VALUES ($1, $2, $3, $4, $5, false) RETURNING id, clinica_nome, email, cnpj',
      [clinica_nome, clinica_nome, email, cnpj || '', senha_hash]
    );

    const novoUsuario = result.rows[0];

    // Criar configurações padrão para a clínica
    await pool.query(
      'INSERT INTO configuracoes (usuario_id, clinica_nome) VALUES ($1, $2)',
      [novoUsuario.id, clinica_nome || '']
    );

    // Gerar código de confirmação e enviar email
    const codigo = gerarCodigo();
    await salvarCodigo(novoUsuario.id, codigo, 'confirmacao');

    enviarEmail({
      para: email,
      assunto: 'Confirme seu email - FuraFila Connect',
      html: gerarCorpoEmailConfirmacao(codigo),
    }).catch(err => console.error('Erro ao enviar email de confirmação:', err.message));

    res.status(201).json({
      sucesso: true,
      mensagem: 'Cadastro realizado. Verifique seu email para confirmar a conta.',
    });
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
      'SELECT id, clinica_nome, email, cnpj, senha_hash, email_confirmado FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    }

    const usuario = result.rows[0];

    // Verificar se email foi confirmado
    if (!usuario.email_confirmado) {
      return res.status(403).json({ erro: 'Email ainda não confirmado. Verifique sua caixa de entrada.' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    }

    // Gerar par de tokens
    const tokens = await createTokenPair(usuario.id, usuario.email);

    // Definir refresh token como cookie httpOnly
    setRefreshTokenCookie(res, tokens.refreshToken, tokens.expiresAt);

    const { id, clinica_nome, email: userEmail, cnpj } = usuario;

    res.json({
      sucesso: true,
      token: tokens.accessToken,
      expiresAt: tokens.expiresAt,
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

// ─── POST /api/auth/refresh ───────────────────────────────────────────
// Renovação de tokens usando refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ erro: 'Refresh token é obrigatório.' });
    }

    const newTokens = await refreshAccessToken(refreshToken);

    if (!newTokens) {
      return res.status(401).json({ erro: 'Refresh token inválido ou expirado. Faça login novamente.' });
    }

    res.json({
      sucesso: true,
      token: newTokens.accessToken,
      expiresAt: newTokens.expiresAt
    });
  } catch (err) {
    console.error('Erro ao refresh:', err.message);
    res.status(500).json({ erro: 'Falha ao renovar sessão.' });
  }
});

// ─── POST /api/auth/logout ───────────────────────────────────────────
// Revogar refresh token (logout)
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    // Limpar cookie de refresh token
    clearRefreshTokenCookie(res);

    res.json({ sucesso: true, mensagem: 'Logout realizado com sucesso.' });
  } catch (err) {
    console.error('Erro ao logout:', err.message);
    res.status(500).json({ erro: 'Falha ao fazer logout.' });
  }
});

// ─── POST /api/auth/enviar-codigo ───────────────────────────────────
// Envia código de confirmação ou reset de senha
router.post('/enviar-codigo', authLimiter, async (req, res) => {
  try {
    const { email, tipo } = req.body;

    if (!email || !tipo || !['confirmacao', 'reset'].includes(tipo)) {
      return res.status(400).json({ erro: 'Email e tipo são obrigatórios.' });
    }

    const result = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);

    // Não revelar se email existe
    if (result.rows.length === 0) {
      return res.json({ sucesso: true, mensagem: 'Se o email existir, um código foi enviado.' });
    }

    const usuarioId = result.rows[0].id;
    const codigo = gerarCodigo();
    await salvarCodigo(usuarioId, codigo, tipo);

    const html = tipo === 'confirmacao'
      ? gerarCorpoEmailConfirmacao(codigo)
      : gerarCorpoEmailReset(codigo);
    const assunto = tipo === 'confirmacao'
      ? 'Confirme seu email - FuraFila Connect'
      : 'Recuperação de senha - FuraFila Connect';

    enviarEmail({ para: email, assunto, html }).catch(err => console.error('Erro ao enviar email:', err.message));

    res.json({ sucesso: true, mensagem: 'Código enviado para o email.' });
  } catch (err) {
    console.error('Erro enviar-codigo:', err.message);
    res.status(500).json({ erro: 'Falha ao processar solicitação.' });
  }
});

// ─── POST /api/auth/verificar-codigo ────────────────────────────────
// Verifica código de confirmação ou reset
router.post('/verificar-codigo', authLimiter, async (req, res) => {
  try {
    const { email, codigo, tipo } = req.body;

    if (!email || !codigo || !tipo) {
      return res.status(400).json({ erro: 'Email, código e tipo são obrigatórios.' });
    }

    const usuarioId = await validarCodigo(email, codigo, tipo);
    if (!usuarioId) {
      return res.status(400).json({ erro: 'Código inválido ou expirado.' });
    }

    if (tipo === 'confirmacao') {
      // Marcar email como confirmado e fazer login automático
      await pool.query('UPDATE usuarios SET email_confirmado = true WHERE id = $1', [usuarioId]);
      await marcarCodigoUsado(usuarioId, 'confirmacao');

      const tokens = await createTokenPair(usuarioId, email);
      setRefreshTokenCookie(res, tokens.refreshToken, tokens.expiresAt);

      const userResult = await pool.query(
        'SELECT id, clinica_nome, email, cnpj FROM usuarios WHERE id = $1',
        [usuarioId]
      );

      res.json({
        sucesso: true,
        token: tokens.accessToken,
        expiresAt: tokens.expiresAt,
        usuario: userResult.rows[0],
      });
    } else {
      // Para reset, marcar código como pendente de uso
      await pool.query(
        'UPDATE password_reset_tokens SET usado_em = NOW() WHERE usuario_id = $1 AND codigo = $2',
        [usuarioId, codigo]
      );
      res.json({ sucesso: true, pendente: true, mensagem: 'Código verificado. Defina sua nova senha.' });
    }
  } catch (err) {
    console.error('Erro verificar-codigo:', err.message);
    res.status(500).json({ erro: 'Falha ao verificar código.' });
  }
});

// ─── POST /api/auth/resetar-senha ───────────────────────────────────
// Redefine senha com código de recuperação
router.post('/resetar-senha', authLimiter, async (req, res) => {
  try {
    const { email, codigo, nova_senha } = req.body;

    if (!email || !codigo || !nova_senha) {
      return res.status(400).json({ erro: 'Email, código e nova senha são obrigatórios.' });
    }

    if (nova_senha.length < 6) {
      return res.status(400).json({ erro: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    const usuarioId = await validarCodigo(email, codigo, 'reset');
    if (!usuarioId) {
      return res.status(400).json({ erro: 'Código inválido ou expirado.' });
    }

    const senha_hash = await bcrypt.hash(nova_senha, 10);
    await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [senha_hash, usuarioId]);
    await marcarCodigoUsado(usuarioId, 'reset');
    await revokeAllUserTokens(usuarioId);

    res.json({ sucesso: true, mensagem: 'Senha alterada com sucesso. Faça login.' });
  } catch (err) {
    console.error('Erro resetar-senha:', err.message);
    res.status(500).json({ erro: 'Falha ao redefinir senha.' });
  }
});

module.exports = router;
