# 🖥️ Frontend Architecture (SPA)

O frontend é uma SPA (Single Page Application) construída com Vanilla JavaScript para máxima performance e baixa pegada de dependências.

## 📄 Estrutura de Páginas (Partials)
Os arquivos em `/frontend/pages/` são carregados dinamicamente no `app.html` via `fetch()`.

- [[dashboard.html.md]]
- [[agenda.html.md]]
- [[clientes.html.md]]
- [[profissionais.html.md]]
- [[configuracoes.html.md]]

## ⚙️ Controladores e Lógica (Scripts)
- [[app.js (Core).md]] - Motor de navegação e autenticação.
- [[auth.js (Helper).md]] - Utilitários de Token, Masks e Logout.
- [[login.js (Controller).md]] - Lógica de entrada.
- [[registrar.js (Controller).md]] - Lógica de cadastro.
- [[agenda.js (Controller).md]]
- [[dashboard.js (Controller).md]]
- [[clientes.js (Controller).md]]
- [[profissionais.js (Controller).md]]
- [[configuracoes.js (Controller).md]]
