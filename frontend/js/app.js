/**
 * app.js — SPA Navigation & Toast System
 * Loads page partials into #pageContent and manages sidebar state.
 */
(function () {
  if (!requireAuth()) return;

  const pageContent = document.getElementById('pageContent');
  const pageTitle = document.getElementById('pageTitle');
  const links = document.querySelectorAll('.sidebar-link[data-page]');
  const btnLogout = document.getElementById('btnLogout');
  const userName = document.getElementById('userName');
  const userClinica = document.getElementById('userClinica');
  const userAvatar = document.getElementById('userAvatar');
  const topBarDate = document.getElementById('topBarDate');
  const btnHamburger = document.getElementById('btnHamburger');
  const sidebar = document.getElementById('sidebar');

  // Page titles
  const titles = {
    dashboard: 'Dashboard',
    agenda: 'Agenda Clínica',
    profissionais: 'Profissionais',
    clientes: 'Clientes & Fila de Espera',
    configuracoes: 'Configurações',
  };

  // Set user info
  const userStr = localStorage.getItem('usuario');
  if (userStr) {
    const usuario = JSON.parse(userStr);
    document.getElementById('userName').textContent = usuario.clinica_nome || 'Clínica';
    document.getElementById('userAvatar').textContent = (usuario.clinica_nome || 'U').charAt(0).toUpperCase();

    if (usuario.nivel === 'Profissional') {
      const links = document.querySelectorAll('.sidebar-link');
      links.forEach(l => {
        const p = l.getAttribute('data-page');
        if (p === 'profissionais' || p === 'configuracoes') l.style.display = 'none';
      });
    }
  }

  // Init Theme
  const btnTheme = document.getElementById('btnThemeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');
  if (btnTheme) {
    const currentTheme = localStorage.getItem('fura_fila_theme') || 'light';
    if (currentTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeIcon.classList.replace('fa-moon', 'fa-sun');
      if (themeText) themeText.textContent = 'Modo Claro';
    }

    btnTheme.addEventListener('click', () => {
      let theme = document.documentElement.getAttribute('data-theme');
      if (theme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('fura_fila_theme', 'light');
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        if (themeText) themeText.textContent = 'Modo Escuro';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('fura_fila_theme', 'dark');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        if (themeText) themeText.textContent = 'Modo Claro';
      }
    });
  }

  // Set date
  topBarDate.textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date());

  // Mobile hamburger
  if (window.innerWidth <= 768) btnHamburger.style.display = 'flex';
  btnHamburger.addEventListener('click', () => sidebar.classList.toggle('open'));

  // Navigation
  let currentPage = '';
  const pageScripts = {};

  async function navigateTo(page) {
    if (page === currentPage) return;
    currentPage = page;

    // Update sidebar active state
    links.forEach(l => l.classList.toggle('active', l.dataset.page === page));
    pageTitle.textContent = titles[page] || page;

    // Close mobile sidebar
    sidebar.classList.remove('open');

    // Load page HTML
    try {
      const res = await fetch(`pages/${page}.html`);
      if (!res.ok) throw new Error('Page not found');
      pageContent.innerHTML = await res.text();
      pageContent.classList.add('animate-fade-in');
      setTimeout(() => pageContent.classList.remove('animate-fade-in'), 500);

      // Execute page-specific init
      if (pageScripts[page]) {
        pageScripts[page]();
      }
    } catch (err) {
      pageContent.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Página não encontrada.</p></div>`;
    }

    // Update hash
    window.location.hash = page;
  }

  // Register page init functions (called by page scripts)
  window.registerPage = function (name, initFn) {
    pageScripts[name] = initFn;
  };

  // Sidebar link clicks
  links.forEach(link => {
    link.addEventListener('click', () => navigateTo(link.dataset.page));
  });

  // Logout
  btnLogout.addEventListener('click', logout);

  // Sidebar collapse
  const btnCollapse = document.getElementById('btnCollapseSidebar');
  const collapseIcon = document.getElementById('sidebarCollapseIcon');
  const collapseText = document.getElementById('sidebarCollapseText');
  const mainContent = document.querySelector('.main-content');

  if (btnCollapse) {
    btnCollapse.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      if (sidebar.classList.contains('collapsed')) {
        collapseIcon.classList.remove('fa-chevron-left');
        collapseIcon.classList.add('fa-chevron-right');
        collapseText.textContent = 'Expandir';
        mainContent.style.marginLeft = '70px';
      } else {
        collapseIcon.classList.remove('fa-chevron-right');
        collapseIcon.classList.add('fa-chevron-left');
        collapseText.textContent = 'Recolher';
        mainContent.style.marginLeft = '';
      }
      localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    });

    // Restore collapsed state
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
      sidebar.classList.add('collapsed');
      collapseIcon.classList.remove('fa-chevron-left');
      collapseIcon.classList.add('fa-chevron-right');
      collapseText.textContent = 'Expandir';
      mainContent.style.marginLeft = '70px';
    }
  }

  // Global utility for XSS protection
  window.escapeHTML = function (str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // Global utility for Phone Mask (XX) XXXXX-XXXX
  window.applyPhoneMask = function (input) {
    if (!input) return;
    input.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 11) value = value.substring(0, 11);
      
      let formatted = '';
      if (value.length > 0) {
        formatted = '(' + value.substring(0, 2);
        if (value.length > 2) {
          formatted += ') ' + value.substring(2, 7);
          if (value.length > 7) {
            formatted += '-' + value.substring(7);
          }
        }
      }
      e.target.value = formatted;
    });
  };

  // Toast system
  window.showToast = function (message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    const icon = type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check';
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color:${type === 'error' ? 'var(--danger)' : 'var(--success)'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
  };

  // Confirmation Modal system
  window.confirmAction = function(title, message) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirmModal');
      const titleEl = document.getElementById('confirmTitle');
      const msgEl = document.getElementById('confirmMessage');
      const okBtn = document.getElementById('confirmOkBtn');
      const cancelBtn = document.getElementById('confirmCancelBtn');

      titleEl.textContent = title;
      msgEl.textContent = message;
      modal.classList.remove('hidden');

      const handleOk = () => {
        cleanup();
        resolve(true);
      };
      const handleCancel = () => {
        cleanup();
        resolve(false);
      };
      const handleKey = (e) => {
        if (e.key === 'Escape') handleCancel();
      };
      const handleClick = (e) => {
        if (e.target === modal) handleCancel();
      };

      const cleanup = () => {
        modal.classList.add('hidden');
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
        document.removeEventListener('keydown', handleKey);
        modal.removeEventListener('click', handleClick);
      };

      okBtn.addEventListener('click', handleOk);
      cancelBtn.addEventListener('click', handleCancel);
      document.addEventListener('keydown', handleKey);
      modal.addEventListener('click', handleClick);
    });
  };

  // Initial page from hash or default
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigateTo(hash);

  // Handle hash changes
  window.addEventListener('hashchange', () => {
    const h = window.location.hash.replace('#', '');
    if (h && h !== currentPage) navigateTo(h);
  });

  // Load page scripts dynamically
  function loadScript(src) {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      document.body.appendChild(s);
    });
  }

  // Pre-load all page scripts
  ['dashboard', 'agenda', 'profissionais', 'clientes', 'configuracoes'].forEach(p => {
    loadScript(`js/${p}.js`);
  });

})();
