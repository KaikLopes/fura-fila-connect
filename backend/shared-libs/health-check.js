/**
 * Health Check para microserviços
 * Monitora a saúde do serviço e dependências
 */

class HealthCheck {
  constructor() {
    this.checks = {};
    this.status = 'UP';
  }

  registerCheck(name, checkFn) {
    this.checks[name] = checkFn;
  }

  async getStatus() {
    const results = {};
    let overallStatus = 'UP';

    for (const [name, checkFn] of Object.entries(this.checks)) {
      try {
        const result = await checkFn();
        results[name] = {
          status: result ? 'UP' : 'DOWN',
          timestamp: new Date().toISOString()
        };
        if (!result) overallStatus = 'DOWN';
      } catch (error) {
        results[name] = {
          status: 'ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        };
        overallStatus = 'DOWN';
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }
}

// Middleware para health check endpoint
const healthCheckMiddleware = (healthCheck) => {
  return async (req, res) => {
    const status = await healthCheck.getStatus();
    const statusCode = status.status === 'UP' ? 200 : 503;
    res.status(statusCode).json(status);
  };
};

module.exports = { HealthCheck, healthCheckMiddleware };
