# Task 20 — Encerramento + Expiração Automática

## Objetivo
Encerrar cotações manualmente ou automaticamente quando o prazo expira.

## O que fazer

### Encerramento Manual (já parcialmente na task 13)
- POST `/quotations/:id/close`
- Muda status para CLOSED
- Todos os QuotationSupplier com status PENDING → EXPIRED
- Magic links invalidados

### Job de Expiração Automática
- **Cloud Scheduler** chamando `POST /api/tasks/expire-quotations` no worker privado com token OIDC
  (sem `@nestjs/schedule`, sem processo vivo — ver task 24)
- Roda a cada hora (`0 * * * *`, timezone `America/Sao_Paulo`)
- Busca cotações OPEN com `deadline < now()`
- Executa mesma lógica do encerramento manual

### Notificação (opcional MVP)
- Ao encerrar, logar evento (prep para notificações futuras P1)

## Critérios de Aceite
- [ ] Encerramento manual funciona
- [ ] Job automático encerra cotações expiradas
- [ ] Fornecedores pendentes marcados como EXPIRED
- [ ] Magic links expirados mostram tela de prazo encerrado

## Refs
- PRD: RF29, RN03
- Task 24: Cloud Scheduler + rotas de task no worker
