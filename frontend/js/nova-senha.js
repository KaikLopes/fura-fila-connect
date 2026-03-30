/**
 * nova-senha.js
 * Handles password reset with code verification.
 */
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email');

  if (!email) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('email').value = email;

  const form = document.getElementById('novaSenhaForm');
  const errBox = document.getElementById('authError');
  const errText = document.getElementById('authErrorText');
  const successBox = document.getElementById('authSuccess');
  const successText = document.getElementById('authSuccessText');
  const btnRedefinir = document.getElementById('btnRedefinir');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.style.display = 'none';
    successBox.style.display = 'none';

    const codigo = document.getElementById('codigo').value;
    const nova_senha = document.getElementById('nova_senha').value;
    const confirmar_senha = document.getElementById('confirmar_senha').value;

    if (nova_senha !== confirmar_senha) {
      errText.textContent = 'As senhas não coincidem.';
      errBox.style.display = 'flex';
      return;
    }

    if (nova_senha.length < 6) {
      errText.textContent = 'A senha deve ter no mínimo 6 caracteres.';
      errBox.style.display = 'flex';
      return;
    }

    btnRedefinir.disabled = true;
    btnRedefinir.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Redefinindo...';

    try {
      const res = await fetch(API_BASE + '/auth/resetar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, codigo, nova_senha }),
      });
      const data = await res.json();

      if (!res.ok) {
        errText.textContent = data.erro || 'Código inválido ou expirado.';
        errBox.style.display = 'flex';
        return;
      }

      successText.textContent = 'Senha redefinida com sucesso! Faça login.';
      successBox.style.display = 'flex';

      setTimeout(() => {
        window.location.href = 'login.html?reset=success';
      }, 2000);
    } catch (err) {
      errText.textContent = 'Servidor indisponível. Tente novamente.';
      errBox.style.display = 'flex';
    } finally {
      btnRedefinir.disabled = false;
      btnRedefinir.innerHTML = '<i class="fa-solid fa-key"></i> Redefinir Senha';
    }
  });
});
