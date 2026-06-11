# 📚 Guia de Migração - Monolítico para Microserviços

## 🎯 Objetivo

Migrar o código existente do `server.js` monolítico para os serviços individuais, mantendo funcionalidade e adicionando resiliência.

## ✅ Checklist de Migração

### Fase 1: Preparação ✓ CONCLUÍDO

- [x] Criar branch `feat/microservices-migration`
- [x] Estruturar diretórios (`services/`, `shared-libs/`)
- [x] Criar shared libraries (Logger, HealthCheck, CircuitBreaker, HttpClient)
- [x] Criar API Gateway
- [x] Criar stubs de todos os 6 serviços
- [x] Criar docker-compose.yml com PostgreSQL e Redis
- [x] Criar .env files para cada serviço
- [x] Documentar arquitetura

### Fase 2: Migração de Código (PRÓXIMA)

- [ ] Migrar middlewares comuns para shared-libs
- [ ] Migrar autenticação (routes/auth.js → auth-service.js)
- [ ] Migrar agenda (routes/agenda.js → agenda-service.js)
- [ ] Migrar profissionais (routes/profissionais.js → profissionais-service.js)
- [ ] Migrar clientes (routes/clientes.js → clientes-service.js)
- [ ] Migrar dashboard (routes/dashboard.js → dashboard-service.js)
- [ ] Migrar configurações (routes/configuracoes.js → configuracoes-service.js)
- [ ] Migrar modelos de banco de dados

### Fase 3: Testes (PRÓXIMA)

- [ ] Testes unitários por serviço
- [ ] Testes de integração entre serviços
- [ ] Testes E2E com docker-compose
- [ ] Testes de resiliência (circuit breaker, retry)
- [ ] Testes de performance

### Fase 4: Deploy (PRÓXIMA)

- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Deploy em staging com docker-compose
- [ ] Deploy em produção (Cloud Run, Heroku, etc.)
- [ ] Monitoramento e logging em produção
- [ ] Plano de rollback

---

## 📋 Como Migrar Código

### Exemplo: Migrar `routes/auth.js` para `auth-service.js`

#### Antes (Monolítico):

```javascript
// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/login', async (req, res) => {
  // ... lógica de login
});

module.exports = router;
```

#### Depois (Microserviço):

```javascript
// services/auth-service.js
const express = require('express');
const { Logger, HealthCheck } = require('../shared-libs');

const app = express();
const logger = new Logger('AUTH-SERVICE');
const healthCheck = new HealthCheck();

// Health check
app.get('/health', healthCheckMiddleware(healthCheck));

// Endpoints
app.post('/api/auth/login', async (req, res) => {
  logger.info('Login attempt', { email: req.body.email });
  // ... MESMA lógica
});

// Iniciar
app.listen(3001, () => {
  logger.info('✅ Auth Service online');
});
```

### Passos Práticos

1. **Copie a lógica de rota** para o novo serviço
2. **Adicione Logger** para cada endpoint
3. **Registre health checks** para dependências
4. **Teste localmente** com o serviço rodando independente
5. **Atualize chamadas inter-serviços** para usar `ResilientHttpClient`
6. **Configure variáveis de ambiente**

---

## 🔌 Como Chamar Outro Serviço

### De dentro do código:

```javascript
const { ResilientHttpClient } = require('../shared-libs');

const httpClient = new ResilientHttpClient();

// GET
const profissionais = await httpClient.get('http://profissionais-service:3001/api/profissionais');

// POST
const novoCliente = await httpClient.post(
  'http://clientes-service:3002/api/clientes',
  { nome: 'João', email: 'joao@email.com' }
);
```

### URLs dos Serviços

```
Auth:            http://auth-service:3001
Agenda:          http://agenda-service:3002
Profissionais:   http://profissionais-service:3003
Clientes:        http://clientes-service:3004
Dashboard:       http://dashboard-service:3005
Configurações:   http://configuracoes-service:3006
```

---

## 🧪 Testar Localmente

### Terminal 1: PostgreSQL
```bash
docker run -d \
  -e POSTGRES_DB=furafila_connect \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine
```

### Terminal 2-8: Cada Serviço

```bash
# Auth Service
node services/auth-service.js

# Agenda Service
node services/agenda-service.js

# etc...
```

### Testar Endpoints

```bash
# Health check do gateway
curl http://localhost:3000/health

# Health check de um serviço
curl http://localhost:3001/health

# Chamar um endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@email.com","senha":"123456"}'
```

---

## 🐳 Com Docker Compose

```bash
# Build
docker-compose build

# Run
docker-compose up -d

# Logs
docker-compose logs -f auth-service

# Ver serviços
docker-compose ps

# Stop
docker-compose down
```

---

## 🛠️ Variáveis de Ambiente

Cada serviço tem seu `.env.<service>`:

```bash
# .env.auth
AUTH_SERVICE_PORT=3001
DB_HOST=postgres
DB_PORT=5432
JWT_SECRET=sua-chave-secreta
```

**Em produção:** Usar secrets do seu provedor cloud (AWS Secrets Manager, Google Secret Manager, etc.)

---

## 🚨 Tratamento de Erros

### Circuit Breaker

Se um serviço ficar indisponível, o circuit breaker abre automaticamente:

```javascript
const CircuitBreaker = require('../shared-libs/circuit-breaker');

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000
});

try {
  const result = await breaker.execute(async () => {
    return await fetch('http://profissionais-service:3003/api/profissionais');
  });
} catch (error) {
  // Serviço indisponível
  logger.error('Serviço indisponível', { error: error.message });
  res.status(503).json({ erro: 'Serviço temporariamente indisponível' });
}
```

---

## 📦 Dependências Compartilhadas

### `shared-libs/index.js` Exporta:

```javascript
module.exports = {
  Logger,                    // Logging centralizado
  HealthCheck,              // Health checks
  healthCheckMiddleware,    // Middleware para /health
  CircuitBreaker,           // Proteção contra falhas
  ResilientHttpClient       // Cliente HTTP com retry + breaker
};
```

### Usar em Qualquer Serviço:

```javascript
const { Logger, HealthCheck, ResilientHttpClient } = require('../shared-libs');

const logger = new Logger('MEU-SERVIÇO');
const httpClient = new ResilientHttpClient();
```

---

## 🎓 Padrões de Microserviços

### 1. API Gateway Pattern
✅ Implementado com `api-gateway.js`

Benefícios:
- Single entry point
- Centralized auth
- Rate limiting global
- Agregação de health checks

### 2. Health Check Pattern
✅ Implementado com `health-check.js`

Benefícios:
- Detectar falhas
- Load balancers sabem desligar instâncias ruins
- Orquestração automática

### 3. Circuit Breaker Pattern
✅ Implementado com `circuit-breaker.js`

Benefícios:
- Evitar cascade failures
- Fast-fail quando serviço está fora
- Tentativa de recuperação automática

### 4. Retry Pattern
✅ Implementado com `http-client.js`

Benefícios:
- Recuperação de falhas temporárias
- Exponential backoff

---

## 📞 Troubleshooting

### Problema: "Connection refused" entre serviços

**Solução:**
```bash
# Verificar se docker network existe
docker network ls

# Ou usar docker-compose que gerencia tudo
docker-compose up -d
```

### Problema: Porta já em uso

**Solução:**
```bash
# Liberar porta
lsof -i :3001
kill -9 <PID>

# Ou usar docker-compose que isola portas
```

### Problema: Database connection error

**Solução:**
```bash
# Verificar PostgreSQL
docker ps | grep postgres

# Verificar credenciais em .env
cat .env.auth | grep DB_
```

---

## ✨ Próximas Melhorias

1. **Service Mesh (Istio)** — Observabilidade automática
2. **API Gateway (Kong/Traefik)** — Mais recursos
3. **Message Queue (RabbitMQ/Kafka)** — Async communication
4. **Distributed Tracing (Jaeger)** — Debug distribuído
5. **Metrics (Prometheus)** — Monitoramento
6. **Observability (ELK Stack)** — Centralized logging

---

**Última atualização:** 11/06/2026
