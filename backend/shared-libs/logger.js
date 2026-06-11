/**
 * Logger centralizado para todos os microserviços
 * Formato: [SERVIÇO] [NÍVEL] [TIMESTAMP] mensagem
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || './logs';

// Criar diretório de logs se não existir
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

class Logger {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.logFile = path.join(LOG_DIR, `${serviceName}.log`);
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      service: this.serviceName,
      level,
      message,
      ...data
    };

    const logString = `[${this.serviceName}] [${level}] [${timestamp}] ${message}${
      Object.keys(data).length > 0 ? ' ' + JSON.stringify(data) : ''
    }`;

    console.log(logString);

    // Escrever em arquivo (opcional, para produção)
    if (process.env.LOG_TO_FILE === 'true') {
      fs.appendFileSync(this.logFile, logString + '\n');
    }
  }

  info(message, data) {
    this.log('INFO', message, data);
  }

  error(message, data) {
    this.log('ERROR', message, data);
  }

  warn(message, data) {
    this.log('WARN', message, data);
  }

  debug(message, data) {
    if (process.env.DEBUG === 'true') {
      this.log('DEBUG', message, data);
    }
  }
}

module.exports = Logger;
