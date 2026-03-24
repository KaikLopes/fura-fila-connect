# 🚪 login.js (Controller)
Controlador da página de autenticação.

## Lógica
- Captura o evento de `submit` do formulário de login.
- Realiza o POST para `/api/auth/login`.
- Em caso de sucesso, armazena o token e redireciona para o `app.html`.
- Em caso de erro, exibe feedback visual amigável.
