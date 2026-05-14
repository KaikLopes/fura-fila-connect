const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Mantendo suas 20 conexões
  min: 5,  // Mantendo 5 ativas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
  // O AJUSTE CRÍTICO PARA O RENDER + SUPABASE:
  ssl: {
    rejectUnauthorized: false 
  }
});

// Tratamento de erros no pool
pool.on('error', (err) => {
  console.error('❌ Erro no pool PostgreSQL:', err);
  // Não encerra o processo em produção para evitar que o servidor caia
  // mas loga o erro para você ver no painel do Render
});

// Confirmação de conexão
pool.on('connect', (client) => {
  console.log('✅ Nova conexão adicionada ao pool');
  // Garante que o banco use o horário de Brasília
  client.query("SET TIME ZONE 'America/Sao_Paulo'");
});

module.exports = pool;