# 🏗️ FuraFila Connect - Arquitetura de Microserviços

## 📋 Visão Geral

FuraFila Connect é uma aplicação de gestão de clínicas construída com **arquitetura de microserviços profissional**, onde cada domínio de negócio é um serviço independente que pode ser escalado, deployado e mantido separadamente.

---

## 🎯 Stack Tecnológico

### Backend
- **Node.js 20** (Alpine) - Runtime
- **Express 4.21** - Framework Web
- **PostgreSQL 16** - Banco de dados relacional
- **Redis 7** - Cache e sessões
- **JWT** - Autenticação stateless
- **Helmet** - Segurança HTTP
- **CORS** - Controle de origem
- **Rate Limiting** - Proteção contra abuso

### Frontend
- **HTML5/CSS3/JavaScript** - SPA (Single Page Application)
- **Fetch API** - Comunicação com backend
- **LocalStorage** - Persistência de sessão

### DevOps
- **Docker** - Containerização
- **Docker Compose** - Orquestração local
- **Alpine Linux** - Imagens otimizadas

---

## 📁 Estrutura de Pastas

```
fura-fila-connect/
├── services/                          # Todos os microserviços
│   ├── api-gateway/                   # Porta 3000 - Roteador central
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── .env.example
│   │   └── src/
│   │       └── index.js               # Lógica do gateway
│   │
│   ├── auth-service/                  # Porta 3001 - Autenticação
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── .env.example
│   │   └── src/
│   │       └── index.js               # JWT, login, registro
│   │
│   ├── agenda-service/                # Porta 3002 - Agendamentos
│   ├── profissionais-service/         # Porta 3003 - Profissionais
│   ├── clientes-service/              # Porta 3004 - Clientes
│   ├── dashboard-service/             # Porta 3005 - Analytics
│   └── configuracoes-service/         # Porta 3006 - Configurações
│
├── shared-libs/                       # Bibliotecas compartilhadas (raiz)
│   ├── logger.js                      # Sistema de logs
│   ├── health-check.js                # Health checks
│   ├── circuit-breaker.js             # Padrão de resiliência
│   ├── http-client.js                 # HTTP com retry
│   ├── index.js                       # Exports centralizados
│   └── package.json
│
├── frontend/                          # Interface web
│   ├── package.json
│   ├── Dockerfile                     # Node + http-server
│   ├── .dockerignore
│   ├── index.html                     # Login
│   ├── app.html                       # Dashboard
│   ├── pages/                         # Páginas SPA
│   │   ├── dashboard.html
│   │   ├── agenda.html
│   │   ├── profissionais.html
│   │   ├── clientes.html
│   │   └── configuracoes.html
│   ├── js/                            # Lógica JavaScript
│   │   ├── app.js                     # SPA navigation
│   │   ├── auth.js                    # Login/logout
│   │   ├── dashboard.js
│   │   ├── agenda.js
│   │   ├── profissionais.js
│   │   ├── clientes.js
│   │   └── configuracoes.js
│   ├── css/                           # Estilos
│   │   ├── global.css
│   │   ├── components.css
│   │   └── pages.css
│   └── assets/
│       └── img/
│
├── docker-compose.yml                 # Orquestração completa
├── .env.example                       # Variáveis de ambiente
├── .dockerignore                      # Otimização de build
├── LICENSE
├── README.md
└── ARCHITECTURE.md                    # Este arquivo

```

---

## 🔄 Fluxo de Requisição Completo

### 1️⃣ Login (Frontend → Backend)

```
NAVEGADOR (localhost:5500)
         │
         ├─ Frontend recebe credenciais
         │
         └─► fetch('http://api-gateway:3000/api/auth/login')
             ├─ POST com email + senha
             │
             API GATEWAY (porta 3000)
             ├─ Recebe POST /api/auth/login
             │
             └─► Roteia para: http://auth-service:3001/api/login
                 ├─ AUTH-SERVICE conecta ao PostgreSQL
                 ├─ Valida email + senha
                 ├─ Gera JWT token
                 │
                 └─► Retorna: { token, usuario }
                     │
                     ◄─ FRONTEND recebe resposta
                        ├─ localStorage.setItem('token', jwt)
                        ├─ localStorage.setItem('usuario', data)
                        └─ Redireciona para app.html
```

### 2️⃣ Requisição Autenticada

```
FRONTEND precisa de dados (ex: listar agenda)
         │
         ├─ Carrega Authorization header
         │
         └─► fetch('http://api-gateway:3000/api/agenda', {
               headers: {
                 'Authorization': 'Bearer {JWT_TOKEN}'
               }
             })
             │
             API GATEWAY valida token
             │
             └─► Roteia para: http://agenda-service:3002/api/agenda
                 ├─ AGENDA-SERVICE valida JWT
                 ├─ Conecta ao PostgreSQL
                 ├─ Executa query
                 │
                 └─► Retorna: { agendas: [...] }
                     │
                     ◄─ FRONTEND renderiza dados
```

### 3️⃣ Comunicação Entre Serviços (dentro da rede Docker)

```
AGENDA-SERVICE precisa de dados de PROFISSIONAIS
         │
         ├─ Usa ResilientHttpClient (circuit breaker + retry)
         │
         └─► http://profissionais-service:3003/api/profissionais
             ├─ Com retry automático (3 tentativas)
             ├─ Com backoff exponencial (1s, 2s, 4s)
             │
             └─► PROFISSIONAIS-SERVICE responde
                 │
                 ◄─ Dados retornam com resiliência garantida
```

---

## 🐳 Docker Compose - Orquestração

### Visão da Rede

```
┌─────────────────────────────────────────────────────────────┐
│            Rede Bridge: furafila_network                    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  INFRAESTRUTURA                                      │   │
│  │  ├─ postgres:5432  (furafila_postgres)             │   │
│  │  └─ redis:6379     (furafila_redis)                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API GATEWAY (porta 3000)                          │   │
│  │  ├─ Roteamento dinâmico                            │   │
│  │  ├─ Service discovery                              │   │
│  │  ├─ Health aggregation                             │   │
│  │  └─ Rate limiting global                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────┬─────────┬──────────┬─────────┬──────────┐     │
│  │  Auth   │ Agenda  │Profiss.  │Clientes │Dashboard │ ... │
│  │ :3001   │ :3002   │ :3003    │ :3004   │ :3005    │     │
│  └─────────┴─────────┴──────────┴─────────┴──────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FRONTEND (porta 5500)                              │   │
│  │  http-server com Node Alpine                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         ▲
         │ Acesso local: localhost:5500
         │ Acesso host: localhost:3000-3006
         │
    NAVEGADOR
```

### Serviços e Portas

| Serviço | Porta | Container | Função |
|---------|-------|-----------|--------|
| **PostgreSQL** | 5432 | furafila_postgres | Banco relacional compartilhado |
| **Redis** | 6379 | furafila_redis | Cache e sessões |
| **API Gateway** | 3000 | furafila_gateway | Roteador central |
| **Auth Service** | 3001 | furafila_auth | JWT, login, registro |
| **Agenda Service** | 3002 | furafila_agenda | Agendamentos |
| **Profissionais** | 3003 | furafila_profissionais | Profissionais/Staff |
| **Clientes** | 3004 | furafila_clientes | Clientes e fila |
| **Dashboard** | 3005 | furafila_dashboard | Analytics e relatórios |
| **Configuracoes** | 3006 | furafila_configuracoes | Configurações do sistema |
| **Frontend** | 5500 | furafila_frontend | Interface web (http-server) |

### Dependências de Inicialização

```
┌─ PostgreSQL ✓ (healthy)
│  └─ Redis ✓
│     └─ API Gateway ✓
│        └─ Auth Service ✓
│        └─ Agenda Service ✓
│        └─ Profissionais ✓
│        └─ Clientes ✓
│        └─ Dashboard ✓
│        └─ Configuracoes ✓
│           └─ Frontend ✓
```

Cada serviço só inicia quando:
1. PostgreSQL está HEALTHY
2. Dependências anteriores iniciaram
3. Health check passa

---

## 🛡️ Padrões de Resiliência

### 1. Circuit Breaker (Estados)

```
CLOSED (Normal)
   ├─ Todas as requisições passam
   ├─ Falhas são contadas
   └─ Se falhas >= 5: → OPEN

OPEN (Circuito Quebrado)
   ├─ Rejeita todas as requisições
   ├─ Espera 60 segundos
   └─ Depois: → HALF_OPEN

HALF_OPEN (Testando Recuperação)
   ├─ Permite 1 requisição de teste
   ├─ Se sucesso: → CLOSED (contador reseta)
   └─ Se falha: → OPEN (60s novamente)
```

### 2. Retry com Backoff Exponencial

```
Requisição falha
   │
   ├─ Tentativa 1: Falha
   │    ├─ Aguarda 1 segundo
   │    └─ Tenta novamente
   │
   ├─ Tentativa 2: Falha
   │    ├─ Aguarda 2 segundos
   │    └─ Tenta novamente
   │
   └─ Tentativa 3: Falha ou Sucesso
        └─ Retorna resultado
```

### 3. Health Checks

```
A cada 30 segundos, cada serviço verifica:

Frontend    → GET /index.html ✅
Gateway     → GET /health ✅
Auth        → GET /health ✅
Agenda      → GET /health ✅
...todos os serviços...
PostgreSQL  → pg_isready ✅
Redis       → redis-cli ping ✅

Se algum falha 3 vezes:
   └─ Docker Compose reinicia automaticamente
```

### 4. Rate Limiting

```
API Gateway (Global)
   └─ 1000 requisições por minuto

Auth Service (Específico)
   └─ 5 tentativas de login por 15 minutos
```

---

## 🚀 Como Executar

### Pré-requisitos

- Docker (versão 20+)
- Docker Compose (versão 1.29+)
- 2GB de RAM livre

### 1️⃣ Configurar Variáveis de Ambiente

```bash
# Na raiz do projeto
cp .env.example .env

# Edite .env conforme necessário (opcional para desenvolvimento)
```

### 2️⃣ Iniciar Stack Completo

```bash
# Build e inicia todos os containers
docker-compose up

# Ou em background
docker-compose up -d
```

### 3️⃣ Acessar Aplicação

- **Frontend**: http://localhost:5500
- **API Gateway**: http://localhost:3000
- **Database**: postgres://postgres:postgres@localhost:5432/furafila_connect

---

## 📊 Monitorar

### Ver logs em tempo real

```bash
# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f frontend
docker-compose logs -f auth-service
docker-compose logs -f postgres
```

### Ver status dos containers

```bash
docker-compose ps
```

### Acessar shell de um container

```bash
docker-compose exec auth-service sh
docker-compose exec postgres psql -U postgres -d furafila_connect
```

---

## 🛑 Comandos Principais

```bash
# Iniciar
docker-compose up
docker-compose up -d

# Parar
docker-compose down

# Parar e remover volumes (limpa BD)
docker-compose down -v

# Rebuild das imagens
docker-compose build --no-cache

# Ver logs
docker-compose logs -f
docker-compose logs -f [service-name]

# Executar comando em container
docker-compose exec [service] [command]

# Remover tudo (containers, images, volumes)
docker-compose down -v --rmi all
```

---

## 🔐 Segurança

### Em Desenvolvimento

- JWT_SECRET: `your-secret-key-change-in-production`
- DB Password: `postgres`
- CORS permite: localhost:5500, localhost:3000

### Em Produção (IMPORTANTE)

1. **Mudar JWT_SECRET**
   ```bash
   JWT_SECRET=seu-secret-super-aleatorio-e-seguro
   ```

2. **Mudar Password do PostgreSQL**
   ```bash
   POSTGRES_PASSWORD=sua-senha-forte-super-secreta
   ```

3. **Configurar Email Real**
   ```bash
   EMAIL_HOST=smtp.gmail.com
   EMAIL_USER=seu-email@gmail.com
   EMAIL_PASSWORD=sua-senha-app
   ```

4. **Usar HTTPS**
   - Configurar reverse proxy (Nginx/Apache)
   - Obter SSL certificate (Let's Encrypt)

5. **Limitar CORS**
   ```javascript
   FRONTEND_URL=https://seu-dominio.com
   ```

---

## 📈 Escalabilidade

### Escalar um Serviço Horizontalmente

```bash
# Aumentar replicas do auth-service (manualmente)
docker-compose up -d --scale auth-service=3
```

### Para Produção (use Kubernetes)

```yaml
# Exemplo: Deployment do auth-service
replicas: 3
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

---

## 🧪 Testes

### Testar Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","senha":"password"}'
```

### Testar Health Check

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
# ... todos os serviços
```

### Testar Health Agregado (Gateway)

```bash
curl http://localhost:3000/health
```

Resposta:
```json
{
  "status": "UP",
  "timestamp": "2026-06-11T10:30:00Z",
  "checks": {
    "auth-service": { "status": "UP", "timestamp": "..." },
    "agenda-service": { "status": "UP", "timestamp": "..." },
    ...
  }
}
```

---

## 📝 Variáveis de Ambiente

### Global (.env)

```env
# PostgreSQL
POSTGRES_DB=furafila_connect
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# JWT
JWT_SECRET=your-super-secret-key

# Node Environment
NODE_ENV=production

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=sua-senha

# Frontend
FRONTEND_URL=http://localhost:5500
```

### Por Serviço (.env.example em cada pasta)

Cada serviço tem seu próprio `.env.example` com variáveis específicas.

---

## 🔗 Referências de Código

### Importar Shared Libraries em um Serviço

```javascript
const path = require('path');
const { Logger, HealthCheck, CircuitBreaker, ResilientHttpClient } 
  = require(path.join(__dirname, '../../shared-libs'));

// Usar
const logger = new Logger('meu-servico');
logger.info('Iniciando serviço');

const healthCheck = new HealthCheck();
healthCheck.registerCheck('database', async () => {
  // Verificar conexão BD
  return { status: 'UP' };
});
```

### Fazer Requisição com Retry

```javascript
const httpClient = new ResilientHttpClient({
  retryAttempts: 3,
  retryDelay: 1000
});

const response = await httpClient.get('http://outro-servico:3002/api/data');
```

### Usar Circuit Breaker

```javascript
const breaker = new CircuitBreaker({
  failureThreshold: 5,
  timeout: 60000
});

const result = await breaker.execute(async () => {
  return await httpClient.get('http://servico:3000/api');
});
```

---

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker-compose logs [service-name]

# Rebuild
docker-compose build --no-cache [service-name]

# Reiniciar
docker-compose restart [service-name]
```

### Porta já está em uso

```bash
# Ver qual processo usa a porta
lsof -i :3000

# Ou liberar a porta no .env
# (mudar portas pode quebrar comunicação)
```

### Banco de dados não conecta

```bash
# Verificar se PostgreSQL está healthy
docker-compose exec postgres pg_isready -U postgres

# Ver logs do PostgreSQL
docker-compose logs postgres

# Conectar ao banco
docker-compose exec postgres psql -U postgres -d furafila_connect
```

### Frontend não carrega

```bash
# Verificar se http-server está rodando
docker-compose logs frontend

# Acessar shell do container
docker-compose exec frontend sh

# Verificar arquivos
ls -la /app
```

---

## 📚 Estrutura de Commits

A branch `feat/microservices-migration` contém:

1. **Commit 1**: Reorganizar microserviços em pastas independentes
2. **Commit 2**: Remover estrutura antiga de backend
3. **Commit 3**: Adicionar frontend e docker-compose completo

---

## 🎯 Próximos Passos

1. ✅ Implementar lógica de negócio em cada serviço
2. ✅ Conectar ao PostgreSQL compartilhado
3. ✅ Testar orquestração do docker-compose
4. ✅ Configurar migrations de banco de dados
5. ✅ Implementar autenticação JWT completa
6. ✅ Deploy em produção (Kubernetes/Azure/AWS)

---

## 📞 Suporte

Para dúvidas sobre arquitetura:
- Consulte os comentários no código
- Verifique logs dos containers
- Execute testes de health check

---

**Versão**: 1.0.0  
**Última atualização**: 11 de junho de 2026  
**Status**: Ativo em desenvolvimento
