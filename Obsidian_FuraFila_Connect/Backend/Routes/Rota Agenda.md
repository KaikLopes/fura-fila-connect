# 🗓️ Rota: Agenda
O motor operacional do sistema.

## Endpoints
- **`GET /api/agenda`**: Lista todos os slots agendados para uma data.
- **`POST /api/agenda`**: Cria um novo agendamento.
- **`PUT /api/agenda/:id/status`**: Atualiza status (Confirmar/Cancelar).
- **`POST /api/agenda/checkout`**: Finaliza a consulta e registra faturamento.
