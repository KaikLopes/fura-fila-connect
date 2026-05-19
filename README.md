# 🏥 FuraFila Connect

Sistema SaaS para clínicas com Recuperação Inteligente de Agendamentos. Converte horários vagos em lucro automatizando o contato com a fila de espera via WhatsApp.

🔗 [Acessar o Projeto Online](furafilaconnect.kaikloepsdev.com.br) | 💼 [Meu Portfólio](https://kaiklopesdev.com.br)

## 🌟 O Diferencial: Taxa de Recuperação Inteligente

O grande diferencial deste sistema não é apenas agendar, mas evitar prejuízos. Quando um paciente cancela um horário de última hora, o sistema:

1. **Identifica automaticamente** o próximo paciente elegível na fila de espera diária.
2. **Gera uma notificação** na tela com os dados do paciente.
3. **Disponibiliza táticas de Copywriting (IA)** — Tons Calmo, Urgente (Escassez) ou Persuasivo (Benefício).
4. **Abre o WhatsApp Web** já com a mensagem persuasiva formatada e o número correto do paciente, pronto para envio.

## 🚀 Funcionalidades

### Gestão e Operação
- **Agenda Inteligente** — Cruzamento de dias de funcionamento da clínica com os dias de atendimento dos profissionais para gerar horários dinâmicos.
- **Fila de Espera Diária** — Gerenciamento efêmero e automático da fila do dia.
- **Profissionais e Clientes** — CRUD completo com histórico e vinculação.
- **Dashboard Analítico** — Métricas em tempo real de ocupação, faturamento do dia e taxa de recuperação.

### Autenticação e Segurança
- **Login Otimizado e Seguro** — Validação rigorosa de hash e JWT.
- **Registro com confirmação de email** — Códigos OTP de 6 dígitos com expiração.
- **Recuperação de senha** — Fluxo seguro via email com tokens temporários.
- **Sessões Seguras** — JWT com refresh tokens e rotação.
- **Rate limiting** — Proteção contra ataques de força bruta.

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Frontend** | HTML5 · CSS3 · JavaScript (Vanilla ES6+) · Hospedado na Vercel |
| **Backend** | [Node.js](https://nodejs.org/) · [Express.js](https://expressjs.com/) · JWT · bcrypt · Hospedado no Render |
| **Banco de Dados** | [Supabase](https://supabase.com/) ([PostgreSQL](https://www.postgresql.org/)) com Connection Pooler (IPv4/IPv6) |
| **Email** | [Nodemailer](https://nodemailer.com/) · Ethereal (desenvolvimento) / SMTP de Produção |

## 🧠 Desafios Técnicos Superados

- **Timezones e Consultas de Datas:** Correção de divergências de fuso horário (GMT-3) no JavaScript Vanilla para garantir que as requisições SQL ao banco de dados sempre filtrassem o dia correto (ISO 8601).
- **Bloqueio IPv6 em Cloud:** Solução do erro `ENETUNREACH` entre o Render e o Supabase através da implementação de um Connection Pooler na porta 6543, garantindo tráfego IPv4 estável e 100% de uptime.
- **Resiliência de DOM:** Blindagem do frontend contra null references durante o carregamento assíncrono de componentes dinâmicos.

## ⚙️ Getting Started

### Pré-requisitos
- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://www.postgresql.org/) 14+ (ou projeto [Supabase](https://supabase.com/))
- Git

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/KaikLopes/fura-fila-connect.git
cd fura-fila-connect

# Instalar dependências do backend
cd backend
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do banco

# Executar migrações (se aplicável ao seu script)
npm run migrate

# Iniciar servidor
npm start
```

### Configuração `.env`

Crie o arquivo `backend/.env`:

```env
# Banco de dados (Use a connection string do pooler caso use Supabase)
DATABASE_URL=postgresql://usuario:senha@localhost:5432/furafila

# Autenticação JWT
JWT_SECRET=sua_chave_secreta_super_segura
REFRESH_SECRET=sua_chave_refresh_secreta

# Servidor
PORT=3000

# SMTP
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_USER=seu@email.com
SMTP_PASS=sua_senha
SMTP_FROM="FuraFila Connect" <noreply@seuservico.com>
```

## 📡 API Endpoints

### Autenticação (públicas)

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/api/auth/registrar` | Cadastro de nova clínica |
| `POST` | `/api/auth/login` | Login com email e senha |
| `POST` | `/api/auth/enviar-codigo` | Envia código OTP (confirmação/reset) |
| `POST` | `/api/auth/verificar-codigo` | Verifica código de confirmação |
| `POST` | `/api/auth/resetar-senha` | Redefine senha com código |
| `POST` | `/api/auth/refresh` | Renova access token |
| `POST` | `/api/auth/logout` | Revoga refresh token |

### Agenda & Dashboards (protegidas)

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/agenda` | Lista horários do dia |
| `GET` | `/api/agenda/status` | Estatísticas de agendamento do dia |
| `POST` | `/api/agenda/cancelar` | Cancela agendamento e aciona fila |
| `POST` | `/api/agenda/confirmar` | Confirma agendamento existente |
| `GET` | `/api/dashboard` | Métricas globais, faturamento e resumo |
| `GET` | `/api/clientes/fila` | Retorna a fila de espera atualizada |

## 📂 Estrutura do Projeto

```text
fura-fila-connect/
├── backend/
│   ├── db/              # Scripts de migração e pool de conexão PG
│   ├── middleware/      # Middlewares (Auth JWT)
│   ├── routes/          # Controladores de rotas da API
│   ├── utils/           # Helpers (Senhas, OTP, Email)
│   ├── .env             # Variáveis de ambiente
│   └── server.js        # Entry point da API
├── frontend/
│   ├── css/             # UI Components, Global e Pages
│   ├── js/              # Lógica Client-side (Vanilla JS)
│   └── *.html           # Views (SPA Principal e Fluxos de Auth)
└── README.md
```

## 🔒 Segurança Aplicada

- ✅ Senhas criptografadas com bcrypt (salt rounds: 10)
- ✅ Access tokens JWT curtos + Refresh tokens com rotação
- ✅ Defesa contra SQL Injection via consultas parametrizadas (pg)
- ✅ Validação robusta de payloads na API
- ✅ Tratamento de CORS para comunicação Frontend-Backend

## 📄 Licença

Este projeto é proprietário e possui todos os direitos reservados (All Rights Reserved). É estritamente proibida a cópia, modificação, distribuição, sublicenciamento e/ou venda deste software, parcial ou integralmente. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

Desenvolvido com ☕ e JavaScript por [Kaik Lopes](https://github.com/KaikLopes).
