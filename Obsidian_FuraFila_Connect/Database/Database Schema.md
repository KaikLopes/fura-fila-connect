# 🗄️ Database Schema (PostgreSQL)

O sistema utiliza PostgreSQL para garantir integridade referencial e suporte a consultas complexas de dashboard.

## 📦 Tabelas do Sistema

### 1. `usuarios` (Clínicas)
- `id`: PK (SERIAL)
- `nome`: Nome do administrador.
- `email`: Email (Unique) - User Login.
- `senha_hash`: Senha criptografada (bcrypt).
- `clinica_nome`: Nome fantasia do estabelecimento.

### 2. `profissionais`
- `id`: PK (SERIAL)
- `nome`: Nome do médico/dentista.
- `especialidade`: Área de atuação.
- `telefone`: Contato.
- `dias_atendimento`: Array de Strings `{Segunda, Terca...}`.
- `usuario_id`: FK -> `usuarios(id)`.

### 3. `clientes` (Pacientes)
- `id`: PK (SERIAL)
- `nome`: Nome completo.
- `telefone`: Contato principal.
- `servico_desejado`: Preferência do paciente.
- `endereco`: Localização.
- `horario_preferido`: Horário de preferência.
- `usuario_id`: FK -> `usuarios(id)`.

### 4. `agenda`
- `id`: PK (SERIAL)
- `data`: Data do atendimento.
- `horario`: Horário marcado.
- `cliente_nome`: Nome do paciente (denormalizado).
- `servico`: Tipo de procedimento.
- `telefone`: Telefone (denormalizado).
- `profissional_id`: FK -> `profissionais(id)`.
- `status`: `Agendado`, `Confirmado`, `Ocupado`.
- `cliente_id`: FK -> `clientes(id)`.
- `usuario_id`: FK -> `usuarios(id)`.

### 5. `fila_espera`
- `id`: PK (SERIAL)
- `cliente_id`: FK -> `clientes(id)`.
- `usuario_id`: FK -> `usuarios(id)`.
- `posicao`: Ordenação na fila.

### 6. `configuracoes`
- `id`: PK (SERIAL)
- `usuario_id`: FK -> `usuarios(id)` (Unique).
- `horario_abertura`: Início da jornada.
- `horario_fechamento`: Fim da jornada.
- `duracao_consulta`: Minutos padrão.
- `whatsapp_numero`: Número de notificações.

### 7. `logs_atividade`
- Gerencia histórico de ações críticas para auditoria.
