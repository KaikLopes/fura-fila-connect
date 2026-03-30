# FuraFila Connect

> Sistema de agendamento para clínicas e consultórios — gerencie profissionais, clientes e horários de forma inteligente.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)
![License](https://img.shields.io/badge/license-MIT-yellow)

## Funcionalidades

### Autenticação e Segurança
- **Registro com confirmação de email** — códigos de 6 dígitos com expiração de 30 minutos
- **Recuperação de senha** — fluxo seguro via email
- **JWT com refresh tokens** — sessões seguras com rotação de tokens
- **Rate limiting** — proteção contra ataques de força bruta

### Gestão
- **Profissionais** — CRUD completo de prestadores de serviço
- **Clientes** — cadastro e histórico de atendimento
- **Agenda Inteligente** — horários disponíveis, agendamento, cancelamento e confirmação
- **Fila de Espera** — gerenciamento automático de espera

### Dashboard
- Métricas em tempo real (consultas do dia, confirmações, pendências)
- Ranking de serviços mais agendados
- Taxa de recuperação de vagas
- Próximo horário disponível

## Stack Tecnológica

| Camada | Tecnologias |
|--------|-------------|
| **Backend** | Node.js · Express.js · PostgreSQL · JWT · bcrypt |
| **Frontend** | HTML5 · CSS3 · JavaScript (Vanilla) |
| **Email** | Nodemailer · Ethereal (desenvolvimento) |
| **Banco** | PostgreSQL com pool de conexões otimizado |

## Getting Started

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://www.postgresql.org/) 14+
- Git

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/KaikLopes/fura-fila-connect.git
cd fura-fila-connect

# Instalar dependências do backend
cd backend
npm install

# Criar banco de dados no PostgreSQL
createdb furafila

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Executar migrações
npm run migrate

# Iniciar servidor
npm start
```

### Configuração

Crie o arquivo `backend/.env`:

```env
# Banco de dados
DATABASE_URL=postgresql://usuario:senha@localhost:5432/furafila

# Autenticação JWT
JWT_SECRET=sua_chave_secreta_super_segura

# Servidor
PORT=3000

# SMTP (opcional - emails simulados no console se não configurado)
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_USER=seu@email.com
SMTP_PASS=sua_senha
SMTP_FROM="FuraFila Connect" <noreply@seuservico.com>
```

### Acesso

Após iniciar o servidor:

- **Frontend**: `http://localhost:3000`
- **API**: `http://localhost:3000/api`
- **Health Check**: `http://localhost:3000/api/health`

## API Endpoints

### Autenticação (públicas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/auth/registrar` | Cadastro de nova clínica |
| `POST` | `/api/auth/login` | Login com email e senha |
| `POST` | `/api/auth/enviar-codigo` | Envia código (confirmação ou reset) |
| `POST` | `/api/auth/verificar-codigo` | Verifica código de confirmação |
| `POST` | `/api/auth/resetar-senha` | Redefine senha com código |
| `POST` | `/api/auth/refresh` | Renova access token |
| `POST` | `/api/auth/logout` | Revoga refresh token |

### Agenda (protegidas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/agenda` | Lista horários do dia |
| `GET` | `/api/agenda/status` | Estatísticas do dia |
| `POST` | `/api/agenda/cancelar` | Cancela agendamento |
| `POST` | `/api/agenda/confirmar` | Confirma agendamento |
| `GET` | `/api/agenda/regenerar` | Regenera horários do dia |
| `GET` | `/api/agenda/tons` | Lista tons de horário |

### Outros (protegidos)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/auth/me` | Perfil do usuário logado |
| `PUT` | `/api/auth/perfil` | Atualiza perfil |
| `PUT` | `/api/auth/senha` | Altera senha |
| `GET/POST` | `/api/profissionais` | CRUD de profissionais |
| `GET/POST` | `/api/clientes` | CRUD de clientes |
| `GET` | `/api/clientes/fila` | Fila de espera |
| `GET` | `/api/dashboard` | Métricas e resumo |
| `GET/PUT` | `/api/configuracoes` | Configurações da clínica |

## Estrutura do Projeto

```
fura-fila-connect/
├── backend/
│   ├── db/
│   │   ├── migrate.js      # Script de migração do banco
│   │   └── pool.js         # Configuração do pool PostgreSQL
│   ├── middleware/
│   │   └── auth.js         # Middleware JWT de autenticação
│   ├── routes/
│   │   ├── agenda.js       # Rotas da agenda
│   │   ├── auth.js         # Rotas de autenticação
│   │   ├── clientes.js     # Rotas de clientes
│   │   ├── configuracoes.js
│   │   ├── dashboard.js    # Rotas do dashboard
│   │   └── profissionais.js
│   ├── utils/
│   │   ├── codigos.js      # Gerador de códigos OTP
│   │   ├── email.js        # Serviço de email
│   │   └── tokens.js       # Utilitários JWT
│   ├── .env                # Variáveis de ambiente (não commitar)
│   ├── package.json
│   └── server.js            # Entry point
├── frontend/
│   ├── css/
│   │   ├── components.css  # Componentes reutilizáveis
│   │   ├── global.css      # Estilos globais e variáveis
│   │   └── pages.css       # Estilos específicos de páginas
│   ├── js/
│   │   ├── agenda.js       # Lógica da agenda
│   │   ├── app.js          # Router e navegação
│   │   ├── auth.js         # Utilitários de autenticação
│   │   ├── clientes.js     # Gerenciamento de clientes
│   │   ├── confirmar-email.js
│   │   ├── configuracoes.js
│   │   ├── dashboard.js    # Lógica do dashboard
│   │   ├── esqueci-senha.js
│   │   ├── login.js
│   │   ├── nova-senha.js
│   │   ├── profissionais.js
│   │   └── registrar.js
│   ├── app.html            # SPA principal
│   ├── confirmar-email.html
│   ├── esqueci-senha.html
│   ├── login.html
│   ├── nova-senha.html
│   └── registrar.html
├── .gitignore
├── README.md
└── LICENSE
```

## Fluxo de Autenticação

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Registro    │────▶│  Email       │────▶│  Confirmação │
│  /registrar  │     │  (código)    │     │  /verificar  │
└──────────────┘     └──────────────┘     └──────────────┘
                                                    │
                                                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  App         │◀────│  Login       │◀────│  JWT Token   │
│  (protegido) │     │  /login      │     │  Gerado      │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Segurança

- ✅ Senhas criptografadas com bcrypt (salt rounds: 10)
- ✅ Access tokens JWT (expiração: 8h)
- ✅ Refresh tokens com rotação (expiração: 7 dias)
- ✅ Cookies httpOnly com SameSite=Strict
- ✅ Rate limiting em todas as rotas de autenticação
- ✅ Validação de input em todos os endpoints

## Desenvolvimento

```bash
# Servidor com hot reload (futuro)
npm run dev

# Executar migrações
npm run migrate

# Ver logs do servidor
npm start
```

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

Desenvolvido com ☕ e JavaScript.
