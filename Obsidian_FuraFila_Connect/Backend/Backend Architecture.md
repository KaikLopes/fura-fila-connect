# ⚙️ Backend Architecture

API RESTful em Node.js e Express conectada ao banco de dados PostgreSQL. 

## 🛣️ Estrutura de Rotas (Router)
- [[Rota Auth]] - Registro, Login e Verificação de Token (JWT).
- [[Rota Agenda]] - CRUD de atendimentos e verificação de horários.
- [[Rota Dashboard]] - Agregação de estatísticas financeiras e de volume.
- [[Rota Clientes e Profissionais]] - Gestão secundária de entidades.

## 🛠️ Middleware e Utilitários
- **`auth.js`**: Proteção de rotas via JWT (Bearer Token).
- **`pool.js`**: Gerenciamento de conexões com o PostgreSQL.
- **`formatters.js`**: Padronização de datas, moedas e máscaras.

## 🛡️ Segurança
- **Rate Limit**: Proteção contra ataques de força bruta.
- **CORS**: Restrito para o domínio da aplicação.
- **Bcrypt**: Criptografia de senhas.
