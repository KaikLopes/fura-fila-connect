require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const autenticar = require('./middleware/auth');

// Rotas
const authRoutes = require('./routes/auth');
const agendaRoutes = require('./routes/agenda');
const profissionaisRoutes = require('./routes/profissionais');
const clientesRoutes = require('./routes/clientes');
const dashboardRoutes = require('./routes/dashboard');
const configuracoesRoutes = require('./routes/configuracoes');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware Global ────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'null',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

// ── Servir Frontend Estático ─────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/login.html'));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── Rotas Públicas (sem JWT) ─────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── Rotas Protegidas (necessitam JWT) ────────────────────────────────
app.use('/api/agenda', autenticar, agendaRoutes);
app.use('/api/profissionais', autenticar, profissionaisRoutes);
app.use('/api/clientes', autenticar, clientesRoutes);
app.use('/api/dashboard', autenticar, dashboardRoutes);
app.use('/api/configuracoes', autenticar, configuracoesRoutes);

// ── Health check ─────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

// ── Inicialização ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 FuraFila Connect v2.1 — PostgreSQL`);
  console.log(`   http://localhost:${PORT}\n`);
  console.log(`🔓 Públicas:`);
  console.log(`   POST /api/auth/registrar`);
  console.log(`   POST /api/auth/login`);
  console.log(`\n🔒 Protegidas (JWT):`);
  console.log(`   GET  /api/auth/me`);
  console.log(`   GET  /api/agenda`);
  console.log(`   GET  /api/agenda/status`);
  console.log(`   POST /api/agenda/cancelar`);
  console.log(`   GET  /api/agenda/regenerar`);
  console.log(`   POST /api/agenda/confirmar`);
  console.log(`   GET  /api/agenda/tons`);
  console.log(`   CRUD /api/profissionais`);
  console.log(`   CRUD /api/clientes`);
  console.log(`   GET  /api/clientes/fila`);
  console.log(`   GET  /api/dashboard`);
  console.log(`   GET  /api/configuracoes`);
  console.log(`   PUT  /api/configuracoes\n`);
});
