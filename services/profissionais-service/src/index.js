require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { Logger, HealthCheck, healthCheckMiddleware } = require(path.join(__dirname, '../../shared-libs'));

const app = express();
const PORT = process.env.PROFISSIONAIS_SERVICE_PORT || 3003;
const logger = new Logger('PROFISSIONAIS-SERVICE');
const healthCheck = new HealthCheck();

logger.info('👨‍⚕️ Profissionais Service iniciando...');

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.GATEWAY_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

healthCheck.registerCheck('database', async () => true);
app.get('/health', healthCheckMiddleware(healthCheck));

app.get('/api/profissionais', (req, res) => {
  logger.info('Listar profissionais');
  res.json({ mensagem: 'Listar profissionais - implementar' });
});

app.post('/api/profissionais', (req, res) => {
  logger.info('Criar profissional');
  res.json({ mensagem: 'Criar profissional - implementar' });
});

app.put('/api/profissionais/:id', (req, res) => {
  logger.info(`Atualizar profissional ${req.params.id}`);
  res.json({ mensagem: 'Atualizar profissional - implementar' });
});

app.delete('/api/profissionais/:id', (req, res) => {
  logger.info(`Deletar profissional ${req.params.id}`);
  res.json({ mensagem: 'Deletar profissional - implementar' });
});

app.get('/info', (req, res) => {
  res.json({ service: 'Profissionais Service', version: '1.0.0', port: PORT });
});

app.listen(PORT, () => {
  logger.info(`✅ Profissionais Service online na porta ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando...');
  process.exit(0);
});

module.exports = app;
