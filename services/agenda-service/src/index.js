require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { Logger, HealthCheck, healthCheckMiddleware } = require(path.join(__dirname, '../../shared-libs'));

const app = express();
const PORT = process.env.AGENDA_SERVICE_PORT || 3002;
const logger = new Logger('AGENDA-SERVICE');
const healthCheck = new HealthCheck();

logger.info('📅 Agenda Service iniciando...');

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.GATEWAY_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

healthCheck.registerCheck('database', async () => true);
app.get('/health', healthCheckMiddleware(healthCheck));

app.get('/api/agenda', (req, res) => {
  logger.info('Listar agendamentos');
  res.json({ mensagem: 'Listar agendamentos - implementar' });
});

app.post('/api/agenda', (req, res) => {
  logger.info('Criar agendamento');
  res.json({ mensagem: 'Criar agendamento - implementar' });
});

app.put('/api/agenda/:id', (req, res) => {
  logger.info(`Atualizar agendamento ${req.params.id}`);
  res.json({ mensagem: 'Atualizar agendamento - implementar' });
});

app.delete('/api/agenda/:id', (req, res) => {
  logger.info(`Deletar agendamento ${req.params.id}`);
  res.json({ mensagem: 'Deletar agendamento - implementar' });
});

app.get('/info', (req, res) => {
  res.json({ service: 'Agenda Service', version: '1.0.0', port: PORT });
});

app.listen(PORT, () => {
  logger.info(`✅ Agenda Service online na porta ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando...');
  process.exit(0);
});

module.exports = app;
