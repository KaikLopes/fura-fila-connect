# 🧠 app.js (Core)
O núcleo da Single Page Application (SPA). Gerencia o ciclo de vida da navegação e o estado global da UI.

## ⚙️ Mecanismos Internos
- **`navigateTo(page)`**: Busca o partial HTML em `/pages/` e injeta no container principal.
- **`registerPage(name, initFn)`**: Sistema de injeção de dependência onde cada controlador se registra para ser executado após o carregamento do HTML correspondente.
- **Tema Dinâmico**: Persiste a preferência de Modo Escuro/Claro no `localStorage`.
- **Sistema de Toasts**: Exibe notificações de sucesso/erro (`showToast`).

## 🛡️ Segurança de Renderização
- **`escapeHTML`**: Sanitização global para prevenir ataques XSS em dados vindos da API.
