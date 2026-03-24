# 📅 agenda.js (Controller)
O controlador mais denso do sistema, gerenciando a visualização e operações da agenda.

## 🛠️ Funcionalidades Principais
- **Sincronização de Data**: Renderiza os atendimentos baseados no `WeekPicker`.
- **Gestão de Status**: Permite marcar como "Confirmado" ou "Cancelar".
- **Fila de Espera**: Gerencia a lista de pacientes aguardando desistências (processo manual).
- **Checkout Dinâmico**: Abre o `checkoutModal` para registrar procedimentos e valores ao fim da consulta.
- **Integração WhatsApp**: Gera links de mensagens pré-formatadas para confirmação ou aviso de vaga.

## 🔗 Relacionamentos
- **Página**: [[agenda.html (Página)]]
- **API**: [[Rota Agenda]]
