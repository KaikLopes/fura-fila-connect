/**
 * registrar.js
 * Handles the registration form submission and clinic account creation.
 */
document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('btnRegister');
    const errMsg = document.getElementById('authError');
    const errText = document.getElementById('authErrorText');

    const clinica_nome = document.getElementById('regClinica').value;
    const cnpj = document.getElementById('regCnpj').value;
    const email = document.getElementById('regEmail').value;
    const senha = document.getElementById('regSenha').value;

    submitBtn.disabled = true;
    const originalHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando...';
    errMsg.style.display = 'none';

    try {
      const res = await fetch(API_BASE + '/auth/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinica_nome, cnpj, email, senha }),
      });
      const data = await res.json();

      if (!res.ok) {
        errText.textContent = data.erro || 'Houve um erro ao registrar sua clínica.';
        errMsg.style.display = 'flex';
        return;
      }

      setToken(data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      window.location.href = 'app.html';
    } catch (err) {
      errText.textContent = 'Servidor indisponível ou erro de rede.';
      errMsg.style.display = 'flex';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHTML;
    }
  });
});
