# 📊 Rota: Dashboard
Agregador de dados para visualização gerencial.

## Endpoints
- **`GET /api/dashboard`**: Retorna consolidados do dia.
  - Resposta:
    ```json
    {
      "faturamento_hoje": 1500.00,
      "consultas_hoje": 12,
      "taxa_recuperacao": 85,
      "proximas_consultas": [...]
    }
    ```
