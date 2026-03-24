const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticação JWT.
 * Espera: Authorization: Bearer <token>
 * Injeta: req.usuarioId, req.usuarioEmail
 */
function autenticar(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido.' });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = payload.id;
    req.usuarioEmail = payload.email;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

module.exports = autenticar;
