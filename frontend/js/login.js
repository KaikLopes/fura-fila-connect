/**
 * login.js
 * Handles the login form submission and authentication.
 */
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

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
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      window.location.href = 'app.html';
    } catch (err) {
      errText.textContent = 'Servidor indisponível ou erro de rede.';
      errBox.style.display = 'flex';
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  });
});
