/**
 * API Gateway - Porta de entrada única para todos os microserviços
 * Responsabilidades:
 * - Roteamento para serviços específicos
 * - Autenticação centralizada (JWT)
 * - Rate limiting
 * - Health checks agregados
 * - Logging e monitoramento
 */

require('dotenv').config({ path: '.env.gateway' });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { Logger, HealthCheck, healthCheckMiddleware, ResilientHttpClient } = require('../shared-libs');

const app = express();
const PORT = process.env.PORT || 3000;
const logger = new Logger('API-GATEWAY');
const healthCheck = new HealthCheck();
const httpClient = new ResilientHttpClient();

// Configuração de microserviços
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  agenda: process.env.AGENDA_SERVICE_URL || 'http://localhost:3002',
  profissionais: process.env.PROFISSIONAIS_SERVICE_URL || 'http://localhost:3003',
  clientes: process.env.CLIENTES_SERVICE_URL || 'http://localhost:3004',
  dashboard: process.env.DASHBOARD_SERVICE_URL || 'http://localhost:3005',
  configuracoes: process.env.CONFIGURACOES_SERVICE_URL || 'http://localhost:3006'
};

logger.info('🚀 API Gateway iniciando', { services: Object.keys(SERVICES) });

// ── Segurança ────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origin não permitida pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ── Rate Limiting ────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000,
  message: { erro: 'Muitas requisições. Aguarde.' }
});
app.use(globalLimiter);

// ── Health Checks dos Serviços ───────────────────────────────────────
Object.entries(SERVICES).forEach(([name, url]) => {
  healthCheck.registerCheck(name, async () => {
    try {
      const res = await httpClient.get(`${url}/health`);
      return res.statusCode === 200;
    } catch {
      return false;
    }
  });
});

// ── Middleware de Logging ────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ── Health Check Endpoint ────────────────────────────────────────────
app.get('/health', healthCheckMiddleware(healthCheck));

// ── Gateway Info ─────────────────────────────────────────────────────
app.get('/gateway-info', (req, res) => {
  res.json({
    name: 'API Gateway',
    version: '1.0.0',
    services: Object.keys(SERVICES),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ── Roteamento Dinâmico para Microserviços ───────────────────────────
const routeToService = async (serviceName, originalPath) => {
  return async (req, res) => {
    const url = `${SERVICES[serviceName]}${originalPath.replace(/^\/api\/[^/]+/, '')}`;

    try {
      logger.debug(`Rotear para ${serviceName}`, { method: req.method, url });

      const result = await httpClient.request(req.method, url, {
        body: req.body,
        headers: {
          'Authorization': req.headers.authorization,
          'Cookie': req.headers.cookie,
          'X-Forwarded-For': req.ip,
          'X-Forwarded-Proto': req.protocol
        },
        timeout: 30000
      });

      // Se for um Set-Cookie, repassar para o cliente
      if (result.headers && result.headers['set-cookie']) {
        res.set('Set-Cookie', result.headers['set-cookie']);
      }

      res.status(result.statusCode).send(result.body);
    } catch (error) {
      logger.error(`Erro ao rotear para ${serviceName}`, {
        error: error.message,
        url,
        service: serviceName
      });
      res.status(503).json({
        erro: `Serviço ${serviceName} indisponível`,
        mensagem: error.message
      });
    }
  };
};

// ── Rotas do Gateway ─────────────────────────────────────────────────
// Auth (sem autenticação)
app.post('/api/auth/login', routeToService('auth', '/api/auth/login'));
app.post('/api/auth/registro', routeToService('auth', '/api/auth/registro'));
app.post('/api/auth/refresh', routeToService('auth', '/api/auth/refresh'));
app.post('/api/auth/confirmar-email', routeToService('auth', '/api/auth/confirmar-email'));
app.post('/api/auth/esqueci-senha', routeToService('auth', '/api/auth/esqueci-senha'));
app.post('/api/auth/nova-senha', routeToService('auth', '/api/auth/nova-senha'));

// Serviços autenticados (Agenda)
app.all('/api/agenda/*', routeToService('agenda', '/api/agenda'));

// Serviços autenticados (Profissionais)
app.all('/api/profissionais/*', routeToService('profissionais', '/api/profissionais'));

// Serviços autenticados (Clientes)
app.all('/api/clientes/*', routeToService('clientes', '/api/clientes'));

// Serviços autenticados (Dashboard)
app.all('/api/dashboard/*', routeToService('dashboard', '/api/dashboard'));

// Serviços autenticados (Configurações)
app.all('/api/configuracoes/*', routeToService('configuracoes', '/api/configuracoes'));

// ── 404 Handler ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada', path: req.path });
});

// ── Error Handler ────────────────────────────────────────────────────
app.use((error, req, res, next) => {
  logger.error('Erro no Gateway', { error: error.message, stack: error.stack });
  res.status(500).json({
    erro: 'Erro interno do servidor',
    mensagem: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
  });
});

// ── Iniciar Servidor ─────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`✅ API Gateway online na porta ${PORT}`);
  logger.info('Serviços configurados:', Object.entries(SERVICES).reduce((acc, [k, v]) => {
    acc[k] = v;
    return acc;
  }, {}));
});

// ── Graceful Shutdown ────────────────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando gracefully...');
  process.exit(0);
});
