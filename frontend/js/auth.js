const API_BASE = 'http://localhost:3000/api';

function getToken() { return localStorage.getItem('token'); }
function setToken(t) { localStorage.setItem('token', t); }
function getRefreshToken() { return localStorage.getItem('refreshToken'); }
function setRefreshToken(t) { localStorage.setItem('refreshToken', t); }
function getUsuario() { try { return JSON.parse(localStorage.getItem('usuario')); } catch { return null; } }

function logout() {
  const refreshToken = getRefreshToken();
  // Revogar token no servidor (não bloqueia se falhar)
  if (refreshToken) {
    fetch(API_BASE + '/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    }).catch(() => {});
  }
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
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

// Tenta renovar o token automaticamente
async function tryRefreshToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(API_BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.sucesso) {
      setToken(data.token);
      setRefreshToken(data.refreshToken);
      return true;
    }
  } catch (err) {}
  }
  return false;
}

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  if (!token) { 
    logout(); 
    return null; 
  }

  try {
    const url = API_BASE + endpoint;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        ...(options.headers || {}),
      },
    });
    
    console.log('[apiFetch] Status:', res.status);

    if (res.status === 401) {
      // Tentar renovar o token
      const renewed = await tryRefreshToken();
      if (renewed) {
        // Retry request com novo token
        const newToken = getToken();
        const retryRes = await fetch(API_BASE + endpoint, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + newToken,
            ...(options.headers || {}),
          },
        });
        if (retryRes.status === 401) { logout(); return null; }
        const data = await retryRes.json();
        console.log('[apiFetch] Retorno após refresh:', data);
        return data;
      }
      logout();
      return null;
    }
    const data = await res.json();
    console.log('[apiFetch] Resposta:', data?.sucesso ? 'OK' : 'ERRO');
    return data;
  } catch (err) {
    console.error('[apiFetch] Exceção:', err.message);
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
