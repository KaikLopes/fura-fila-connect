/**
 * AUTH SERVICE - Microserviço de Autenticação
 * Porta: 3001
 * Responsável por: Login, registro, JWT, refresh tokens, confirmação de email
 */

require('dotenv').config({ path: '.env.auth' });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { Logger, HealthCheck, healthCheckMiddleware } = require('../shared-libs');

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3001;
const logger = new Logger('AUTH-SERVICE');
const healthCheck = new HealthCheck();

logger.info('🔐 Auth Service iniciando...');

// ── Segurança ────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5500',
    process.env.GATEWAY_URL
  ],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// ── Rate Limiting (Mais restritivo para auth) ────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { erro: 'Muitas tentativas de login. Aguarde 15 minutos.' }
});

// ── Health Check da Autenticação ─────────────────────────────────────
// Registrar check do banco de dados
healthCheck.registerCheck('database', async () => {
  // TODO: Implementar check real do pool de DB
  return true;
});

app.get('/health', healthCheckMiddleware(healthCheck));

// ── Rotas de Autenticação ────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Login de usuário
 */
app.post('/api/auth/login', authLimiter, (req, res) => {
  logger.info('Login attempt', { email: req.body.email });
  // TODO: Implementar lógica de login
  res.json({
    mensagem: 'Login endpoint - implementar lógica',
    status: 'desenvolvimento'
  });
});

/**
 * POST /api/auth/registro
 * Registrar novo usuário
 */
app.post('/api/auth/registro', (req, res) => {
  logger.info('Novo registro', { email: req.body.email });
  // TODO: Implementar lógica de registro
  res.json({
    mensagem: 'Registro endpoint - implementar lógica',
    status: 'desenvolvimento'
  });
});

/**
 * POST /api/auth/refresh
 * Renovar JWT token
 */
app.post('/api/auth/refresh', (req, res) => {
  logger.info('Token refresh');
  // TODO: Implementar lógica de refresh
  res.json({
    mensagem: 'Refresh endpoint - implementar lógica',
    status: 'desenvolvimento'
  });
});

/**
 * POST /api/auth/confirmar-email
 * Confirmar email do usuário
 */
app.post('/api/auth/confirmar-email', (req, res) => {
  logger.info('Email confirmation attempt');
  // TODO: Implementar lógica de confirmação
  res.json({
    mensagem: 'Email confirmation endpoint - implementar lógica',
    status: 'desenvolvimento'
  });
});

/**
 * POST /api/auth/esqueci-senha
 * Iniciar reset de senha
 */
app.post('/api/auth/esqueci-senha', authLimiter, (req, res) => {
  logger.info('Forgot password request', { email: req.body.email });
  // TODO: Implementar lógica de reset
  res.json({
    mensagem: 'Forgot password endpoint - implementar lógica',
    status: 'desenvolvimento'
  });
});

/**
 * POST /api/auth/nova-senha
 * Confirmar nova senha
 */
app.post('/api/auth/nova-senha', (req, res) => {
  logger.info('New password confirmation');
  // TODO: Implementar lógica de confirmação
  res.json({
    mensagem: 'New password endpoint - implementar lógica',
    status: 'desenvolvimento'
  });
});

// ── Service Info ─────────────────────────────────────────────────────
app.get('/info', (req, res) => {
  res.json({
    service: 'Auth Service',
    version: '1.0.0',
    port: PORT
  });
});

// ── Error Handler ────────────────────────────────────────────────────
app.use((error, req, res, next) => {
  logger.error('Erro no Auth Service', { error: error.message });
  res.status(500).json({
    erro: 'Erro interno do servidor',
    mensagem: process.env.NODE_ENV === 'development' ? error.message : ''
  });
});

// ── Iniciar Servidor ─────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`✅ Auth Service online na porta ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando gracefully...');
  process.exit(0);
});

module.exports = app;
