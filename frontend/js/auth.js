const API_BASE = 'http://localhost:3000/api';

function getToken() { return localStorage.getItem('token'); }
function setToken(t) { localStorage.setItem('token', t); }
function getUsuario() { try { return JSON.parse(localStorage.getItem('usuario')); } catch { return null; } }

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = 'login.html';
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  if (!token) { logout(); return null; }

  try {
    const res = await fetch(API_BASE + endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        ...(options.headers || {}),
      },
    });

    if (res.status === 401) { logout(); return null; }
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return null;
  }
}

// ═══════════ GLOBAL INPUT MASKS ═══════════
function applyGenericMask(e) {
  const target = e.target;
  const val = target.value.replace(/\D/g, '');
  const id = target.id.toLowerCase();
  
  if (id.includes('cpf') || id.includes('cnpj')) {
    if (id.includes('cnpj')) {
      target.value = val.replace(/^(\d{2})(\d)/, '$1.$2')
                        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                        .replace(/\.(\d{3})(\d)/, '.$1/$2')
                        .replace(/(\d{4})(\d)/, '$1-$2')
                        .substring(0, 18);
    } else {
      target.value = val.replace(/(\d{3})(\d)/, '$1.$2')
                        .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
                        .replace(/\.(\d{3})(\d{1,2})/, '.$1-$2')
                        .substring(0, 14);
    }
  } else if (id.includes('telefone') || id.includes('whatsapp') || id.includes('tel') || target.id === 'slotTelefone') {
    target.value = val.replace(/(\d{2})(\d)/, '($1) $2')
                      .replace(/(\(\d{2}\) \d{4,5})(\d{4})/, '$1-$2')
                      .substring(0, 15);
  }
}

document.addEventListener('input', (e) => {
  if (e.target.tagName === 'INPUT') {
    const id = e.target.id.toLowerCase();
    if (id.includes('cpf') || id.includes('cnpj') || id.includes('telefone') || id.includes('whatsapp') || id.includes('tel') || e.target.id === 'slotTelefone') {
      applyGenericMask(e);
    }
  }
});

// ═══════════ TOGGLE PASSWORD ═══════════
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  // Find the actual <i> icon — btn may be the <i> itself or a <button> wrapping it
  const icon = btn.tagName === 'I' ? btn : btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
  } else {
    input.type = 'password';
    if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
  }
}
