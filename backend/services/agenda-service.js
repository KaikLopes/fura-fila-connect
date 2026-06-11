/**
 * AGENDA SERVICE - Microserviço de Agendamentos
 * Porta: 3002
 * Responsável por: Gestão de agendamentos e horários
 */

require('dotenv').config({ path: '.env.agenda' });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Logger, HealthCheck, healthCheckMiddleware } = require('../shared-libs');

const app = express();
const PORT = process.env.AGENDA_SERVICE_PORT || 3002;
const logger = new Logger('AGENDA-SERVICE');
const healthCheck = new HealthCheck();

logger.info('📅 Agenda Service iniciando...');

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.GATEWAY_URL, credentials: true }));
app.use(express.json());

healthCheck.registerCheck('database', async () => true);
app.get('/health', healthCheckMiddleware(healthCheck));

// Rotas
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
