/**
 * HTTP Client com Retry e Circuit Breaker
 * Para comunicação inter-serviços resiliente
 */

const http = require('http');
const https = require('https');
const CircuitBreaker = require('./circuit-breaker');

class ResilientHttpClient {
  constructor(options = {}) {
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.circuitBreaker = new CircuitBreaker(options.circuitBreakerOptions);
  }

  async request(method, url, options = {}) {
    const makeRequest = async () => {
      return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.request(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          timeout: options.timeout || 10000
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ statusCode: res.statusCode, body: data });
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        if (options.body) {
          req.write(JSON.stringify(options.body));
        }

        req.end();
      });
    };

    // Usar circuit breaker
    return this.circuitBreaker.execute(async () => {
      let lastError;
      for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
        try {
          return await makeRequest();
        } catch (error) {
          lastError = error;
          if (attempt < this.retryAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
          }
        }
      }
      throw lastError;
    });
  }

  get(url, options) {
    return this.request('GET', url, options);
  }

  post(url, body, options) {
    return this.request('POST', url, { ...options, body });
  }

  put(url, body, options) {
    return this.request('PUT', url, { ...options, body });
  }

  delete(url, options) {
    return this.request('DELETE', url, options);
  }
}

module.exports = ResilientHttpClient;
