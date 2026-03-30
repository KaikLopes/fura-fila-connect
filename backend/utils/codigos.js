const crypto = require('crypto');
const pool = require('../db/pool');

const CODIGO_EXPIRA_MINUTOS = 30;

function gerarCodigo() {
  return crypto.randomInt(100000, 999999).toString();
}

async function salvarCodigo(usuarioId, codigo, tipo) {
  const expiraEm = new Date();
  expiraEm.setMinutes(expiraEm.getMinutes() + CODIGO_EXPIRA_MINUTOS);

  if (tipo === 'confirmacao') {
    await pool.query(
      'UPDATE usuarios SET codigo_confirmacao = $1 WHERE id = $2',
      [codigo, usuarioId]
    );
    await pool.query(
      `INSERT INTO email_verifications (usuario_id, codigo, expira_em)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id) DO UPDATE SET codigo = $2, expira_em = $3, usado_em = NULL`,
      [usuarioId, codigo, expiraEm]
    );
  } else {
    await pool.query(
      `INSERT INTO password_reset_tokens (usuario_id, codigo, expira_em)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id) DO UPDATE SET codigo = $2, expira_em = $3, usado_em = NULL`,
      [usuarioId, codigo, expiraEm]
    );
  }
}

async function validarCodigo(email, codigo, tipo) {
  const usuarioRes = await pool.query(
    'SELECT id FROM usuarios WHERE email = $1',
    [email]
  );
  if (usuarioRes.rows.length === 0) return null;
  const usuarioId = usuarioRes.rows[0].id;

  let record;
  if (tipo === 'confirmacao') {
    const res = await pool.query(
      `SELECT id FROM email_verifications
       WHERE usuario_id = $1 AND codigo = $2 AND expira_em > NOW() AND usado_em IS NULL`,
      [usuarioId, codigo]
    );
    record = res.rows[0];
  } else {
    const res = await pool.query(
      `SELECT id FROM password_reset_tokens
       WHERE usuario_id = $1 AND codigo = $2 AND expira_em > NOW() AND usado_em IS NULL`,
      [usuarioId, codigo]
    );
    record = res.rows[0];
  }

  return record ? usuarioId : null;
}

async function marcarCodigoUsado(usuarioId, tipo) {
  if (tipo === 'confirmacao') {
    await pool.query(
      'UPDATE email_verifications SET usado_em = NOW() WHERE usuario_id = $1 AND usado_em IS NULL',
      [usuarioId]
    );
    await pool.query(
      'UPDATE usuarios SET codigo_confirmacao = NULL WHERE id = $1',
      [usuarioId]
    );
  } else {
    await pool.query(
      'UPDATE password_reset_tokens SET usado_em = NOW() WHERE usuario_id = $1 AND usado_em IS NULL',
      [usuarioId]
    );
  }
}

module.exports = { gerarCodigo, salvarCodigo, validarCodigo, marcarCodigoUsado, CODIGO_EXPIRA_MINUTOS };
