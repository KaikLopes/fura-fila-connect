# 🏗️ Arquitetura de Microserviços - FuraFila Connect

## 📋 Visão Geral

Este projeto foi migrado de uma arquitetura **monolítica** para uma arquitetura de **microserviços** profissional, garantindo:

- ✅ **Isolamento de Falhas**: Se um serviço cair, os outros continuam funcionando
- ✅ **Escalabilidade Independente**: Cada serviço pode ser escalado conforme necessário
- ✅ **Desenvolvimento Paralelo**: Equipes podem trabalhar em serviços diferentes
- ✅ **Deploy Independente**: Cada serviço tem seu próprio ciclo de vida
- ✅ **Resiliência**: Circuit breakers, retries e health checks integrados

---

## 🏛️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (SPA)                           │
│                    (React, Vue, Vanilla JS)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (3000)                          │
│              Roteamento • Rate Limiting • Auth                   │
│            Health Check Agregado • Logging                       │
└──────┬──────┬──────┬──────┬──────┬──────┬──────────────────────┘
       │      │      │      │      │      │
       │      │      │      │      │      │
   Port 3001 3002  3003   3004   3005   3006
   
┌──────────┬──────────┬──────────────┬──────────┬──────────┬─────────────┐
│  Auth    │  Agenda  │ Profissionais│ Clientes │Dashboard │Configurações│
│ Service  │ Service  │   Service    │ Service  │ Service  │   Service   │
├──────────┼──────────┼──────────────┼──────────┼──────────┼─────────────┤
│ JWT      │Agendas   │ Cadastro     │ Cadastro │ Stats    │   Dados     │
│ Login    │ Horários │ Profissionais│ Clientes │ Rankings │   Sistema   │
│ Refresh  │ Bloqueios│ Disponibilid.│ Contatos │ Gráficos │             │
└──────────┴──────────┴──────────────┴──────────┴──────────┴─────────────┘
       │      │      │      │      │      │
       │      │      │      │      │      │
       └──────────────┬──────────────────┘
                      │
                      ▼
            ┌──────────────────────┐
            │   Shared Libraries   │
            ├──────────────────────┤
            │ • Logger             │
            │ • Health Check       │
            │ • Circuit Breaker    │
            │ • HTTP Client        │
            └──────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                         │
│                                                                  │
│  Base de dados centralizada com schemas isolados por serviço   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Estrutura de Diretórios

```
backend/
├── services/
│   ├── api-gateway.js              # Porta de entrada (3000)
│   ├── auth-service.js             # Autenticação (3001)
│   ├── agenda-service.js           # Agendamentos (3002)
│   ├── profissionais-service.js    # Profissionais (3003)
│   ├── clientes-service.js         # Clientes (3004)
│   ├── dashboard-service.js        # Dashboard (3005)
│   ├── configuracoes-service.js    # Configurações (3006)
│   ├── Dockerfile.gateway          # Docker para gateway
│   └── Dockerfile.service          # Docker para serviços
├── shared-libs/
│   ├── logger.js                   # Logger centralizado
│   ├── health-check.js             # Health checks
│   ├── circuit-breaker.js          # Proteção contra falhas
│   ├── http-client.js              # Cliente HTTP resiliente
│   └── index.js                    # Exportações
├── .env.gateway                    # Config do gateway
├── .env.auth                       # Config do auth
├── .env.agenda                     # Config da agenda
├── .env.profissionais              # Config de profissionais
├── .env.clientes                   # Config de clientes
├── .env.dashboard                  # Config do dashboard
├── .env.configuracoes              # Config de configurações
├── docker-compose.yml              # Orquestração de containers
├── MICROSERVICES_ARCHITECTURE.md   # Este arquivo
└── package.json                    # Dependências compartilhadas
```

---

## 🚀 Como Executar

### Pré-requisitos

- Docker & Docker Compose
- Node.js 20+ (para desenvolvimento local)

### Executar com Docker Compose

```bash
# Ir para o diretório backend
cd backend

# Build das imagens (primeira vez)
docker-compose build

# Executar todos os serviços
docker-compose up -d

# Ver logs em tempo real
docker-compose logs -f

# Verificar saúde dos serviços
curl http://localhost:3000/health
```

### Executar Localmente (Desenvolvimento)

```bash
# Terminal 1 - API Gateway
node services/api-gateway.js

# Terminal 2 - Auth Service
node services/auth-service.js

# Terminal 3 - Agenda Service
node services/agenda-service.js

# Terminal 4 - Profissionais Service
node services/profissionais-service.js

# Terminal 5 - Clientes Service
node services/clientes-service.js

# Terminal 6 - Dashboard Service
node services/dashboard-service.js

# Terminal 7 - Configurações Service
node services/configuracoes-service.js
```

---

## 🔧 Configuração de Microserviços

### API Gateway

**Responsabilidades:**
- Roteamento de requisições para serviços específicos
- Autenticação centralizada (JWT validation)
- Rate limiting global
- Agregação de health checks
- CORS & headers de segurança

**Endpoints:**
- `GET /health` — Status dos serviços
- `GET /gateway-info` — Informações do gateway
- `POST /api/auth/*` — Roteia para Auth Service
- `GET /api/agenda/*` — Roteia para Agenda Service
- etc...

### Auth Service (3001)

**Responsabilidades:**
- Login e registro de usuários
- Geração e validação de JWT
- Refresh de tokens
- Confirmação de email
- Reset de senha

**Endpoints:**
- `POST /api/auth/login`
- `POST /api/auth/registro`
- `POST /api/auth/refresh`
- `POST /api/auth/confirmar-email`
- `POST /api/auth/esqueci-senha`
- `POST /api/auth/nova-senha`

### Serviços de Domínio

Cada serviço (Agenda, Profissionais, Clientes, etc.) segue o mesmo padrão:

- Health check disponível em `/health`
- Informações do serviço em `/info`
- Endpoints específicos em `/api/<recurso>`
- Circuit breaker para chamadas inter-serviços
- Logging centralizado

---

## 🛡️ Resiliência e Confiabilidade

### Health Checks

Cada serviço expõe um endpoint de health check:

```bash
curl http://localhost:3001/health
```

Resposta:
```json
{
  "status": "UP",
  "timestamp": "2024-06-11T10:20:30Z",
  "checks": {
    "database": {
      "status": "UP",
      "timestamp": "2024-06-11T10:20:30Z"
    }
  }
}
```

### Circuit Breaker

Padrão de resiliência que previne cascade failures:

```javascript
// Estados: CLOSED (normal) → OPEN (falha) → HALF_OPEN (recuperando)

const breaker = new CircuitBreaker({
  failureThreshold: 5,      // Abrir após 5 falhas
  successThreshold: 2,      // Fechar após 2 sucessos em HALF_OPEN
  timeout: 60000            // 60 segundos antes de tentar HALF_OPEN
});

// Uso
try {
  const result = await breaker.execute(async () => {
    return await httpClient.get(url);
  });
} catch (error) {
  // Circuit aberto ou erro na requisição
}
```

### Retry com Backoff Exponencial

Tentativas automáticas com delays crescentes:

```javascript
// Até 3 tentativas com backoff: 1s, 2s, 4s
const client = new ResilientHttpClient({
  retryAttempts: 3,
  retryDelay: 1000
});
```

---

## 📊 Monitoramento e Logging

### Logs Centralizados

```javascript
const Logger = require('../shared-libs/logger');
const logger = new Logger('SERVIÇO-NOME');

logger.info('Mensagem informativa', { dados: 'adicionais' });
logger.error('Erro ocorreu', { erro: 'detalhe' });
logger.warn('Aviso', { aviso: 'atenção' });
logger.debug('Debug (se DEBUG=true)', { dados });
```

Formato: `[SERVIÇO] [NÍVEL] [TIMESTAMP] mensagem`

### Endpoints de Monitoramento

- `GET /health` — Status do serviço
- `GET /health` (Gateway) — Status de todos os serviços
- `GET /info` — Informações do serviço

---

## 🔄 Comunicação Inter-Serviços

Serviços se comunicam através do HTTP com cliente resiliente:

```javascript
const ResilientHttpClient = require('../shared-libs/http-client');

const httpClient = new ResilientHttpClient({
  retryAttempts: 3,
  retryDelay: 1000,
  circuitBreakerOptions: {
    failureThreshold: 5,
    timeout: 60000
  }
});

// GET
const result = await httpClient.get('http://auth-service:3001/api/auth/validate');

// POST
const result = await httpClient.post(
  'http://profissionais-service:3003/api/profissionais',
  { nome: 'João', especialidade: 'Dentista' }
);
```

---

## 🗄️ Banco de Dados

PostgreSQL centralizado com schemas isolados por serviço:

```
Database: furafila_connect
├── schema public (compartilhado)
├── schema auth (auth-service)
├── schema agenda (agenda-service)
├── schema profissionais (profissionais-service)
├── schema clientes (clientes-service)
├── schema dashboard (dashboard-service)
└── schema configuracoes (configuracoes-service)
```

**Próximas etapas:** Implementar migrações separadas por serviço usando Liquibase ou Flyway.

---

## 📈 Escalabilidade

### Horizontal Scaling

Com Kubernetes ou Docker Swarm:

```bash
# Escalar um serviço para 3 réplicas
docker-compose up -d --scale agenda-service=3

# Com Kubernetes
kubectl scale deployment agenda-service --replicas=3
```

### Load Balancing

Adicionar Nginx ou HAProxy como load balancer na porta 3000.

---

## 🔐 Segurança

- ✅ JWT tokens para autenticação
- ✅ Helmet.js para headers de segurança
- ✅ Rate limiting por serviço
- ✅ CORS configurável
- ✅ Cookie seguro para refresh tokens
- ✅ Validação de input (a implementar)
- ✅ Criptografia de senhas (bcrypt)

---

## 📝 Próximas Etapas

1. **Implementar Lógica de Negócio** — Completar endpoints de cada serviço
2. **Testes** — Unit tests, integration tests, e2e tests
3. **CI/CD** — GitHub Actions para deploy automático
4. **Service Mesh** — Istio para observabilidade e controle de tráfego
5. **Caching** — Redis para cache distribuído
6. **Observabilidade** — Prometheus + Grafana + Jaeger
7. **Documentação** — OpenAPI/Swagger para cada serviço
8. **Segurança** — OAuth2, rate limiting avançado, WAF

---

## 🎯 Benefícios Desta Arquitetura

| Aspecto | Antes (Monolítico) | Depois (Microserviços) |
|--------|-------------------|----------------------|
| **Falha** | Toda a aplicação cai | Serviço específico cai |
| **Deploy** | Redeploy inteiro | Deploy independente |
| **Escalabilidade** | Scale de tudo | Scale seletivo |
| **Desenvolvimento** | Um monorrepo | Múltiplos repos |
| **Performance** | Acoplamento alto | Desacoplamento |
| **Manutenção** | Difícil em larga escala | Mais gerenciável |

---

## 📞 Suporte

Para dúvidas sobre a arquitetura, consulte:
- Este documento (`MICROSERVICES_ARCHITECTURE.md`)
- Código nas pastas `services/` e `shared-libs/`
- Logs em `backend/logs/`

---

**Migração concluída em:** 11/06/2026  
**Branch:** `feat/microservices-migration`
