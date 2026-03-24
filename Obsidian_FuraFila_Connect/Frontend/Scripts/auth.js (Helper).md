# 🔐 auth.js (Helper)
Centraliza as funções de utilidade e segurança do frontend.

## Funções
- `getToken()` / `setToken()`: Gerencia o JWT no LocalStorage.
- `apiFetch(endpoint, options)`: Wrapper sobre o `fetch` nativo que injeta o Bearer Token automaticamente.
- `applyGenericMask(e)`: Aplica máscaras de CPF e Telefone em tempo real.
- `togglePassword(id, btn)`: Alterna visibilidade de campos de senha.
