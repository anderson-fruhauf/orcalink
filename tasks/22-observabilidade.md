# Task 22 — Observabilidade (Logs, Health Checks)

## Objetivo
Logging estruturado e endpoints de monitoramento.

## O que fazer

1. **Logging Estruturado**:
   - Logger customizado (ou Pino) com output JSON
   - Correlation ID por request (via interceptor)
   - Log de: requests (método, rota, status, duração), erros, eventos de negócio
   - Nos handlers de task: `queueName`, `taskName`, `X-CloudTasks-TaskRetryCount` e o
     `correlationId` propagado no payload (rastreia publish → task → envio)

2. **Health Checks**:
   - GET `/health` — retorna `{ status: "ok", timestamp }`
   - GET `/ready` — verifica conexão com PostgreSQL (e, no worker, acessibilidade da fila do
     Cloud Tasks)

3. **Exception Filter Global**:
   - Captura todas as exceções
   - Log estruturado do erro
   - Resposta padronizada: `{ statusCode, message, error, correlationId }`

## Critérios de Aceite
- [ ] Logs em formato JSON no stdout
- [ ] Correlation ID presente em todos os logs de uma request
- [ ] `/health` retorna 200
- [ ] `/ready` retorna 503 se o PostgreSQL estiver offline
- [ ] Erros 500 logados com stack trace completo
- [ ] Logs de task incluem fila, nome da task e número da tentativa

## Refs
- PRD: RNF09
- Task 24: fila assíncrona (origem dos logs de task)
