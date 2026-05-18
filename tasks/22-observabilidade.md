# Task 22 — Observabilidade (Logs, Health Checks)

## Objetivo
Logging estruturado e endpoints de monitoramento.

## O que fazer

1. **Logging Estruturado**:
   - Logger customizado (ou Pino) com output JSON
   - Correlation ID por request (via interceptor)
   - Log de: requests (método, rota, status, duração), erros, eventos de negócio

2. **Health Checks**:
   - GET `/health` — retorna `{ status: "ok", timestamp }`
   - GET `/ready` — verifica conexão com PostgreSQL e Redis

3. **Exception Filter Global**:
   - Captura todas as exceções
   - Log estruturado do erro
   - Resposta padronizada: `{ statusCode, message, error, correlationId }`

## Critérios de Aceite
- [ ] Logs em formato JSON no stdout
- [ ] Correlation ID presente em todos os logs de uma request
- [ ] `/health` retorna 200
- [ ] `/ready` retorna 503 se DB ou Redis offline
- [ ] Erros 500 logados com stack trace completo

## Refs
- PRD: RNF09
