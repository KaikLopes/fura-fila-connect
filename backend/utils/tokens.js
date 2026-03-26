/**
 * tokens.js - Utilitários para geração e verificação de tokens JWT
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');

// Configurações
const ACCESS_TOKEN_EXPIRES_IN = '8h'; // Access token expira em 8 horas
const REFRESH_TOKEN_EXPIRES_DAYS = 7; // Refresh token expira em 7 dias

/**
 * Gera um access token JWT
 * @param {Object} payload - Dados a serem incluídos no token
 * @returns {string} Access token
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN
  });
}

/**
 * Gera um refresh token aleatório
 * @returns {string} Refresh token aleatório
 */
function generateRefreshTokenString() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Cria um novo par de tokens (access + refresh)
 * @param {number} usuarioId - ID do usuário
 * @param {string} email - Email do usuário
 * @returns {Object} { accessToken, refreshToken, expiresAt }
 */
async function createTokenPair(usuarioId, email) {
  const accessToken = generateAccessToken({ id: usuarioId, email });
  const refreshTokenString = generateRefreshTokenString();

  // Calcular data de expiração do refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

  // Salvar refresh token no banco
  await pool.query(
    'INSERT INTO refresh_tokens (usuario_id, token, expires_at) VALUES ($1, $2, $3)',
    [usuarioId, refreshTokenString, expiresAt]
  );

  return {
    accessToken,
    refreshToken: refreshTokenString,
    expiresAt: expiresAt.toISOString()
  };
}

/**
 * Verifica e renova um refresh token
 * @param {string} refreshToken - Refresh token a ser verificado
 * @returns {Object|null} Novo par de tokens ou null se inválido
 */
async function refreshAccessToken(refreshToken) {
  try {
    // Buscar refresh token no banco
    const result = await pool.query(
      'SELECT id, usuario_id, expires_at FROM refresh_tokens WHERE token = $1',
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return null; // Token não encontrado
    }

    const tokenRecord = result.rows[0];

    // Verificar se expirou
    if (new Date(tokenRecord.expires_at) < new Date()) {
      // Token expirado, remover do banco
      await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [tokenRecord.id]);
      return null;
    }

    // Buscar dados do usuário
    const userResult = await pool.query(
      'SELECT id, email FROM usuarios WHERE id = $1',
      [tokenRecord.usuario_id]
    );

    if (userResult.rows.length === 0) {
      return null; // Usuário não encontrado
    }

    const usuario = userResult.rows[0];

    // Remover o refresh token antigo (rotation)
    await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [tokenRecord.id]);

    // Gerar novos tokens
    return await createTokenPair(usuario.id, usuario.email);
  } catch (err) {
    console.error('Erro ao verificar refresh token:', err.message);
    return null;
  }
}

/**
 * Revoga um refresh token (logout)
 * @param {string} refreshToken - Refresh token a ser revogado
 * @returns {boolean} True se revogado com sucesso
 */
async function revokeRefreshToken(refreshToken) {
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    return true;
  } catch (err) {
    console.error('Erro ao revogar refresh token:', err.message);
    return false;
  }
}

/**
 * Revoga todos os refresh tokens de um usuário
 * @param {number} usuarioId - ID do usuário
 * @returns {boolean} True se revogado com sucesso
 */
async function revokeAllUserTokens(usuarioId) {
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE usuario_id = $1', [usuarioId]);
    return true;
  } catch (err) {
    console.error('Erro ao revogar tokens:', err.message);
    return false;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshTokenString,
  createTokenPair,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_DAYS
};