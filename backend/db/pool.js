const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Aumentar de 10 (padrão) para 20 conexões
  min: 5,  // Manter 5 conexões sempre ativas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
});

pool.on('error', (err) => {
  console.error('❌ Erro no pool PostgreSQL:', err);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('✅ Nova conexão adicionada ao pool');
});

module.exports = pool;
