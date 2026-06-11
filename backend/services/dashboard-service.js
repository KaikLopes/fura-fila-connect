/**
 * DASHBOARD SERVICE - Microserviço de Dashboard e Analytics
 * Porta: 3005
 * Responsável por: Dashboards, relatórios e analytics
 */

require('dotenv').config({ path: '.env.dashboard' });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Logger, HealthCheck, healthCheckMiddleware } = require('../shared-libs');

const app = express();
const PORT = process.env.DASHBOARD_SERVICE_PORT || 3005;
const logger = new Logger('DASHBOARD-SERVICE');
const healthCheck = new HealthCheck();

logger.info('📊 Dashboard Service iniciando...');

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.GATEWAY_URL, credentials: true }));
app.use(express.json());

healthCheck.registerCheck('database', async () => true);
app.get('/health', healthCheckMiddleware(healthCheck));

app.get('/api/dashboard', (req, res) => {
  logger.info('Buscar dados do dashboard');
  res.json({ mensagem: 'Dashboard data - implementar' });
});

app.get('/api/dashboard/ranking', (req, res) => {
  logger.info('Buscar ranking');
  res.json({ mensagem: 'Dashboard ranking - implementar' });
});

app.get('/api/dashboard/stats', (req, res) => {
  logger.info('Buscar estatísticas');
  res.json({ mensagem: 'Dashboard stats - implementar' });
});

app.get('/info', (req, res) => {
  res.json({ service: 'Dashboard Service', version: '1.0.0', port: PORT });
});

app.listen(PORT, () => {
  logger.info(`✅ Dashboard Service online na porta ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando...');
  process.exit(0);
});

module.exports = app;
