/**
 * Script de migração — cria todas as tabelas no PostgreSQL.
 * Executar: node db/migrate.js
 */
const pool = require('./pool');

const SQL = `

-- ═══════════════════════════════════════════
--  TABELA: usuarios (clínicas)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(120) UNIQUE NOT NULL,
  senha_hash  VARCHAR(255) NOT NULL,
  clinica_nome VARCHAR(150),
  criado_em   TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════
--  TABELA: profissionais
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profissionais (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(120) NOT NULL,
  especialidade   VARCHAR(100),
  telefone        VARCHAR(30),
  dias_atendimento TEXT[] DEFAULT '{}',
  usuario_id      INT REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════
--  TABELA: clientes
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS clientes (
  id               SERIAL PRIMARY KEY,
  nome             VARCHAR(120) NOT NULL,
  telefone         VARCHAR(30),
  servico_desejado VARCHAR(100),
  endereco         VARCHAR(200),
  horario_preferido TIME,
  usuario_id       INT REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════
--  TABELA: historico_consultas
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS historico_consultas (
  id         SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clientes(id) ON DELETE CASCADE,
  data       DATE NOT NULL,
  servico    VARCHAR(100)
);

-- ═══════════════════════════════════════════
--  TABELA: agenda
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agenda (
  id              SERIAL PRIMARY KEY,
  data            DATE DEFAULT CURRENT_DATE,
  horario         TIME NOT NULL,
  cliente_nome    VARCHAR(120),
  servico         VARCHAR(100),
  telefone        VARCHAR(30),
  profissional_id INT REFERENCES profissionais(id) ON DELETE SET NULL,
  status          VARCHAR(30) DEFAULT 'Ocupado',
  cliente_id      INT REFERENCES clientes(id) ON DELETE SET NULL,
  usuario_id      INT REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════
--  TABELA: fila_espera
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS fila_espera (
  id         SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clientes(id) ON DELETE CASCADE,
  usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
  posicao    INT DEFAULT 0
);

-- ═══════════════════════════════════════════
--  TABELA: configuracoes
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS configuracoes (
  id                  SERIAL PRIMARY KEY,
  usuario_id          INT REFERENCES usuarios(id) ON DELETE CASCADE UNIQUE,
  horario_abertura    TIME DEFAULT '08:00',
  horario_fechamento  TIME DEFAULT '18:00',
  dias_funcionamento  TEXT[] DEFAULT '{Segunda,Terca,Quarta,Quinta,Sexta}',
  duracao_consulta    INT DEFAULT 30,
  whatsapp_numero     VARCHAR(20) DEFAULT '558387800619',
  clinica_nome        VARCHAR(150)
);

-- ═══════════════════════════════════════════
--  TABELA: logs_atividade
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS logs_atividade (
  id         SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
  acao       VARCHAR(80),
  detalhes   JSONB DEFAULT '{}',
  criado_em  TIMESTAMP DEFAULT NOW()
);

`;

async function migrate() {
  console.log('🔄 Executando migração...');
  try {
    await pool.query(SQL);
    console.log('✅ Todas as tabelas foram criadas com sucesso!');
    console.log('   • usuarios');
    console.log('   • profissionais');
    console.log('   • clientes');
    console.log('   • historico_consultas');
    console.log('   • agenda');
    console.log('   • fila_espera');
    console.log('   • configuracoes');
    console.log('   • logs_atividade');
  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
