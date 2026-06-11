/**
 * Shared Libraries para todos os microserviços
 * Exporta utilitários comuns, health checks, circuit breakers, etc
 */

module.exports = {
  Logger: require('./logger'),
  HealthCheck: require('./health-check').HealthCheck,
  healthCheckMiddleware: require('./health-check').healthCheckMiddleware,
  CircuitBreaker: require('./circuit-breaker'),
  ResilientHttpClient: require('./http-client')
};
