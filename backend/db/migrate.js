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

-- ═══════════════════════════════════════════
--  INDEXES DE PERFORMANCE
-- ═══════════════════════════════════════════

-- Agenda: consultas por usuário, data e profissional
CREATE INDEX IF NOT EXISTS idx_agenda_usuario_data ON agenda(usuario_id, data, profissional_id);
CREATE INDEX IF NOT EXISTS idx_agenda_data_horario ON agenda(data, horario);
CREATE INDEX IF NOT EXISTS idx_agenda_cliente_id ON agenda(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agenda_status ON agenda(status);

-- Clientes: busca por usuário e CPF
CREATE INDEX IF NOT EXISTS idx_clientes_usuario_id ON clientes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes((regexp_replace(cpf, '\\D', '', 'g')));

-- Histórico: consultas por cliente
CREATE INDEX IF NOT EXISTS idx_historico_cliente_id ON historico_consultas(cliente_id, data DESC);

-- Profissionais: busca por usuário
CREATE INDEX IF NOT EXISTS idx_profissionais_usuario_id ON profissionais(usuario_id);

-- Fila de espera: busca por usuário e posição
CREATE INDEX IF NOT EXISTS idx_fila_espera_usuario_posicao ON fila_espera(usuario_id, posicao);

-- Logs de atividade: buscas por usuário e data
CREATE INDEX IF NOT EXISTS idx_logs_usuario_data ON logs_atividade(usuario_id, criado_em DESC);

-- Constraint unique para evitar agendamento duplo no mesmo horário/profissional
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uk_agenda_concorrencia'
  ) THEN
    ALTER TABLE agenda ADD CONSTRAINT uk_agenda_concorrencia
      UNIQUE (usuario_id, profissional_id, data, horario);
  END IF;
END
$$;

-- ═══════════════════════════════════════════
--  TABELA: refresh_tokens
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT REFERENCES usuarios(id) ON DELETE CASCADE,
  token       VARCHAR(255) UNIQUE NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- ═══════════════════════════════════════════
--  COLUNAS: email_confirmado + codigo temp
-- ═══════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'email_confirmado'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN email_confirmado BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'codigo_confirmacao'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN codigo_confirmacao VARCHAR(10);
  END IF;
END
$$;

-- ═══════════════════════════════════════════
--  TABELA: email_verifications
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS email_verifications (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT REFERENCES usuarios(id) ON DELETE CASCADE UNIQUE,
  codigo      VARCHAR(10) NOT NULL,
  expira_em   TIMESTAMP NOT NULL,
  usado_em    TIMESTAMP,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_usuario ON email_verifications(usuario_id);

-- ═══════════════════════════════════════════
--  TABELA: password_reset_tokens
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT REFERENCES usuarios(id) ON DELETE CASCADE UNIQUE,
  codigo      VARCHAR(10) NOT NULL,
  expira_em   TIMESTAMP NOT NULL,
  usado_em    TIMESTAMP,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_usuario ON password_reset_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_codigo ON password_reset_tokens(codigo);

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
    console.log('   • refresh_tokens');
    console.log('   • email_verifications');
    console.log('   • password_reset_tokens');
    console.log('   • indexes de performance');
    console.log('   • constraint uk_agenda_concorrencia');
    console.log('   • colunas email_confirmado, codigo_confirmacao em usuarios');
  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
