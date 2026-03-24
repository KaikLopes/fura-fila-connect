# Fura-Fila Connect

O Fura-Fila Connect é um sistema de agendamento de horários projetado para otimizar a gestão de compromissos entre profissionais e clientes. A plataforma permite que profissionais configurem seus horários de atendimento e que clientes marquem e gerenciem seus agendamentos de forma simples e intuitiva.

## ✨ Funcionalidades

- **Gestão de Profissionais:** Cadastro e gerenciamento de perfis de profissionais.
- **Gestão de Clientes:** Cadastro e gerenciamento de perfis de clientes.
- **Agenda Inteligente:** Visualização de horários disponíveis, agendamento, e cancelamento de compromissos.
- **Dashboard:** Painel com um resumo das principais métricas e informações relevantes.
- **Autenticação Segura:** Sistema de login e registro com autenticação baseada em JWT (JSON Web Tokens).

## 🚀 Tecnologias Utilizadas

O projeto é dividido em duas partes principais: o **Backend**, que é a API RESTful responsável pela lógica de negócio, e o **Frontend**, que é a interface com a qual o usuário interage.

### Backend

- **Node.js:** Ambiente de execução para o JavaScript no servidor.
- **Express.js:** Framework para a construção da API RESTful.
- **PostgreSQL:** Banco de dados relacional para o armazenamento dos dados.
- **JSON Web Tokens (JWT):** Para a implementação de um sistema de autenticação seguro.
- **bcrypt.js:** Biblioteca para a criptografia de senhas.
- **CORS:** Middleware para permitir requisições de diferentes origens.
- **Dotenv:** Para o gerenciamento de variáveis de ambiente.

### Frontend

- **HTML5:** Linguagem de marcação para a estrutura das páginas.
- **CSS3:** Para a estilização dos componentes e layout.
- **JavaScript (Vanilla):** Para a manipulação do DOM e lógica da interface, sem a utilização de frameworks.

## ⚙️ Como Executar o Projeto

Siga os passos abaixo para executar o projeto em seu ambiente local.

### Pré-requisitos

- [Node.js](https://nodejs.org/en/) instalado.
- [PostgreSQL](https://www.postgresql.org/download/) instalado e em execução.

### 1. Configuração do Backend

Clone o repositório e, dentro da pasta `backend`, instale as dependências:

```bash
cd backend
npm install
```

Crie um arquivo `.env` na raiz da pasta `backend` e adicione as seguintes variáveis de ambiente, substituindo pelos seus dados do PostgreSQL e um segredo para o JWT:

```
DB_USER=seu_usuario
DB_HOST=localhost
DB_DATABASE=sua_database
DB_PASSWORD=sua_senha
DB_PORT=5432
JWT_SECRET=seu_segredo_super_secreto
```

Execute as migrações para criar as tabelas no banco de dados:

```bash
npm run migrate
```

Inicie o servidor do backend:

```bash
npm start
```

O servidor estará em execução em `http://localhost:3000`.

### 2. Acessando o Frontend

Não há um processo de build para o frontend. Basta abrir os arquivos `.html` (como `login.html`, `registrar.html` ou `index.html`) diretamente no seu navegador. A aplicação se conectará ao backend que está em execução localmente.

## 📁 Estrutura do Projeto

```
fura-fila-connect/
├── backend/                # Código-fonte da API (Node.js)
│   ├── db/                 # Configuração do banco de dados e migrações
│   ├── middleware/         # Middlewares do Express (ex: autenticação)
│   ├── routes/             # Definição das rotas da API
│   ├── server.js           # Arquivo principal do servidor
│   └── package.json
├── frontend/               # Código-fonte da interface do usuário
│   ├── css/                # Folhas de estilo
│   ├── js/                 # Scripts JavaScript para cada página
│   ├── pages/              # Páginas HTML da aplicação
│   ├── app.html            # Estrutura principal da aplicação
│   └── login.html          # Página de login
└── Obsidian_FuraFila_Connect/ # Documentação e anotações do projeto
```
