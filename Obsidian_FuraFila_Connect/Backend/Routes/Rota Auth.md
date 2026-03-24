# 🔑 Rota: Auth
Gerenciamento de acesso e segurança da clínica.

## Endpoints
- **`POST /api/auth/registrar`**: Cria uma nova conta de clínica.
  - Body: `{ clinica_nome, cnpj, email, senha }`
- **`POST /api/auth/login`**: Autentica o usuário e gera um token JWT.
  - Body: `{ email, senha }`
  - Resposta: `{ token, usuario: { id, nome, clinica_nome... } }`
