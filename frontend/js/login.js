/**
 * login.js
 * Handles the login form submission and authentication.
 */
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const btnRecrutador = document.getElementById('btnRecrutador'); 

  if (!loginForm) return;

  // Verifica mensagens de sucesso de redefinição de senha
  const params = new URLSearchParams(window.location.search);
  if (params.get('reset') === 'success') {
    const successBox = document.getElementById('authSuccess');
    const successText = document.getElementById('authSuccessText');
    if (successBox && successText) {
      successText.textContent = 'Senha redefinida com sucesso! Faça login.';
      successBox.style.display = 'flex';
    }
    const url = new URL(window.location);
    url.searchParams.delete('reset');
    window.history.replaceState({}, document.title, url);
  }

  // ─── LÓGICA DO BOTÃO DE VISITANTE (RECRUTADOR) ──────────────────────
  if (btnRecrutador) {
    btnRecrutador.addEventListener('click', async () => {
      const originalHTML = btnRecrutador.innerHTML;
      btnRecrutador.disabled = true;
      btnRecrutador.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';

      try {
        const res = await fetch(API_BASE + '/auth/index', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Necessário para cookies em produção
          body: JSON.stringify({
            email: 'recrutador@furafila.com',
            senha: 'portfolio2026'
          }),
        });

        const data = await res.json();

        if (res.ok) {
          setToken(data.token);
          localStorage.setItem('usuario', JSON.stringify(data.usuario));
          window.location.href = 'app.html';
        } else {
          // Se der 401 aqui, é porque o SQL no banco falhou ou a senha está errada
          alert('Erro no acesso: ' + (data.erro || 'Verifique as credenciais no banco.'));
        }
      } catch (err) {
        alert('Erro: Servidor indisponível ou erro na URL da API.');
      } finally {
        btnRecrutador.disabled = false;
        btnRecrutador.innerHTML = originalHTML;
      }
    });
  }

  // ─── LÓGICA DO LOGIN PADRÃO ──────────────────────────────────────────
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnLogin');
    const errBox = document.getElementById('authError');
    const errText = document.getElementById('authErrorText');

    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';
    errBox.style.display = 'none';

    try {
      const res = await fetch(API_BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: document.getElementById('email').value,
          senha: document.getElementById('senha').value,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        errText.textContent = data.erro || 'Email ou senha incorretos.';
        errBox.style.display = 'flex';
        return;
      }

      setToken(data.token);
      if (data.refreshToken) {
        setRefreshToken(data.refreshToken);
      }
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      window.location.href = 'app.html';
    } catch (err) {
      errText.textContent = 'Erro de rede ou servidor offline.';
      errBox.style.display = 'flex';
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  });
});