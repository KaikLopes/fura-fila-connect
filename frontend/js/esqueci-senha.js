/**
 * esqueci-senha.js
 * Handles password reset request.
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('esqueciForm');
  const errBox = document.getElementById('authError');
  const errText = document.getElementById('authErrorText');
  const successBox = document.getElementById('authSuccess');
  const successText = document.getElementById('authSuccessText');
  const btnEnviar = document.getElementById('btnEnviar');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.style.display = 'none';
    successBox.style.display = 'none';

    const email = document.getElementById('email').value;

    btnEnviar.disabled = true;
    btnEnviar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

    try {
      const res = await fetch(API_BASE + '/auth/enviar-codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tipo: 'reset' }),
      });

      // Sempre retorna sucesso para evitar enumeração
      successText.textContent = 'Se o email estiver cadastrado, você receberá um código de recuperação.';
      successBox.style.display = 'flex';

      // Redireciona após 2 segundos
      setTimeout(() => {
        window.location.href = 'nova-senha.html?email=' + encodeURIComponent(email);
      }, 2000);
    } catch (err) {
      errText.textContent = 'Servidor indisponível. Tente novamente.';
      errBox.style.display = 'flex';
    } finally {
      btnEnviar.disabled = false;
      btnEnviar.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Código';
    }
  });
});
