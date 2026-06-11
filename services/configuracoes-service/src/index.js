require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { Logger, HealthCheck, healthCheckMiddleware } = require(path.join(__dirname, '../../shared-libs'));

const app = express();
const PORT = process.env.CONFIGURACOES_SERVICE_PORT || 3006;
const logger = new Logger('CONFIGURACOES-SERVICE');
const healthCheck = new HealthCheck();

logger.info('⚙️ Configurações Service iniciando...');

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.GATEWAY_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

healthCheck.registerCheck('database', async () => true);
app.get('/health', healthCheckMiddleware(healthCheck));

app.get('/api/configuracoes', (req, res) => {
  logger.info('Buscar configurações');
  res.json({ mensagem: 'Configurações - implementar' });
});

app.put('/api/configuracoes', (req, res) => {
  logger.info('Atualizar configurações');
  res.json({ mensagem: 'Atualizar configurações - implementar' });
});

app.get('/api/configuracoes/:chave', (req, res) => {
  logger.info(`Buscar configuração: ${req.params.chave}`);
  res.json({ mensagem: 'Buscar configuração específica - implementar' });
});

app.get('/info', (req, res) => {
  res.json({ service: 'Configuracoes Service', version: '1.0.0', port: PORT });
});

app.listen(PORT, () => {
  logger.info(`✅ Configurações Service online na porta ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando...');
  process.exit(0);
});

module.exports = app;
