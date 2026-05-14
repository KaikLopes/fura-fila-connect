require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

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

// ── Segurança e Proxies (Para Deploy) ────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet()); 
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origin não permitida pelo CORS'));
    }
  },
  credentials: true, // Necessário para cookies de Refresh Token
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json());
app.use(cookieParser());

// ── Rate Limiting ────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 120, 
  message: { erro: 'Muitas requisições. Aguarde um momento.' }
});

// ── Rotas ────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/agenda', apiLimiter, autenticar, agendaRoutes);
app.use('/api/profissionais', apiLimiter, autenticar, profissionaisRoutes);
app.use('/api/clientes', apiLimiter, autenticar, clientesRoutes);
app.use('/api/dashboard', apiLimiter, autenticar, dashboardRoutes);
app.use('/api/configuracoes', apiLimiter, autenticar, configuracoesRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 FuraFila Connect v2.1 Online na porta ${PORT}`);
});