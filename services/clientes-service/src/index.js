require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { Logger, HealthCheck, healthCheckMiddleware } = require(path.join(__dirname, '../../shared-libs'));

const app = express();
const PORT = process.env.CLIENTES_SERVICE_PORT || 3004;
const logger = new Logger('CLIENTES-SERVICE');
const healthCheck = new HealthCheck();

logger.info('👥 Clientes Service iniciando...');

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.GATEWAY_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

healthCheck.registerCheck('database', async () => true);
app.get('/health', healthCheckMiddleware(healthCheck));

app.get('/api/clientes', (req, res) => {
  logger.info('Listar clientes');
  res.json({ mensagem: 'Listar clientes - implementar' });
});

app.post('/api/clientes', (req, res) => {
  logger.info('Criar cliente');
  res.json({ mensagem: 'Criar cliente - implementar' });
});

app.put('/api/clientes/:id', (req, res) => {
  logger.info(`Atualizar cliente ${req.params.id}`);
  res.json({ mensagem: 'Atualizar cliente - implementar' });
});

app.delete('/api/clientes/:id', (req, res) => {
  logger.info(`Deletar cliente ${req.params.id}`);
  res.json({ mensagem: 'Deletar cliente - implementar' });
});

app.get('/info', (req, res) => {
  res.json({ service: 'Clientes Service', version: '1.0.0', port: PORT });
});

app.listen(PORT, () => {
  logger.info(`✅ Clientes Service online na porta ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando...');
  process.exit(0);
});

module.exports = app;
