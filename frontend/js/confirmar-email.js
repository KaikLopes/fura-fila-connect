/**
 * confirmar-email.js
 * Handles email confirmation after registration.
 */
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email');

  if (!email) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('email').value = email;

  const form = document.getElementById('confirmForm');
  const errBox = document.getElementById('authError');
  const errText = document.getElementById('authErrorText');
  const successBox = document.getElementById('authSuccess');
  const successText = document.getElementById('authSuccessText');
  const btnConfirmar = document.getElementById('btnConfirmar');
  const btnReenviar = document.getElementById('btnReenviar');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.style.display = 'none';
    successBox.style.display = 'none';

    const codigo = document.getElementById('codigo').value;

    btnConfirmar.disabled = true;
    btnConfirmar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Confirmando...';

    try {
      const res = await fetch(API_BASE + '/auth/verificar-codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, codigo, tipo: 'confirmacao' }),
      });
      const data = await res.json();

      if (!res.ok) {
        errText.textContent = data.erro || 'Código inválido ou expirado.';
        errBox.style.display = 'flex';
        return;
      }

      setToken(data.token);
      if (data.refreshToken) {
        setRefreshToken(data.refreshToken);
      }
      localStorage.setItem('usuario', JSON.stringify(data.usuario));

      successText.textContent = 'Email confirmado! Entrando...';
      successBox.style.display = 'flex';

      setTimeout(() => {
        window.location.href = 'app.html';
      }, 1000);
    } catch (err) {
      errText.textContent = 'Servidor indisponível ou erro de rede.';
      errBox.style.display = 'flex';
    } finally {
      btnConfirmar.disabled = false;
      btnConfirmar.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar Email';
    }
  });

  btnReenviar.addEventListener('click', async () => {
    btnReenviar.disabled = true;
    btnReenviar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

    try {
      const res = await fetch(API_BASE + '/auth/enviar-codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tipo: 'confirmacao' }),
      });

      successText.textContent = 'Código reenviado! Verifique sua caixa de entrada.';
      successBox.style.display = 'flex';
    } catch (err) {
      errText.textContent = 'Erro ao reenviar. Tente novamente.';
      errBox.style.display = 'flex';
    } finally {
      btnReenviar.disabled = false;
      btnReenviar.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Não recebeu? Reenviar código';
    }
  });
});
