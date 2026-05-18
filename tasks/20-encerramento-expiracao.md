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
- Cron job (BullMQ repeatable ou `@nestjs/schedule`)
- Roda a cada hora
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
