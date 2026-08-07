# Task 28 — Lembretes Automáticos (1 dia antes do prazo)

> **Fase:** P1 — Automação (v1.1).
> **Camada:** Backend + Infra.
> **Depende de:** 14 (Magic Links), 15 (Disparo de E-mail), 20 (Expiração), 23 (WhatsApp), 24 (Cloud Tasks).

## Objetivo

Avisar automaticamente fornecedores que ainda não responderam quando a cotação está a **1 dia** do prazo, reenviando o Magic Link no **mesmo canal escolhido na cotação** (`QuotationSupplier.channel`: EMAIL ou WHATSAPP).

## Contexto

O PRD lista **Lembretes Automáticos** em P1 (*“Reenvio automático configurável para fornecedores que não responderam”*). O reenvio manual (RF17) e o pipeline Cloud Tasks já existem; esta task adiciona o cron e o fan-out por cotação.

A task 23 (WhatsApp) deixou lembretes explicitamente fora de escopo, apontando para esta task própria.

## Arquitetura

```
[Cloud Scheduler: remind-pending-quotations]  (0 9 * * *, fuso do sistema, OIDC)
        │ POST /api/tasks/remind-pending-quotations
        ▼
[Cloud Run: orcalink-worker]
        │ busca OPEN com deadline = amanhã (data civil) e PENDING
        │ para cada cotação → enqueue
        ▼
[Cloud Tasks: remind-quotation]   (1 task por cotação, dedupe por dia)
        │ POST /api/tasks/remind-quotation
        ▼
[orcalink-worker] filtra PENDING, respeita channel
        ├─ EMAIL    → fila email-dispatch (1 task / fornecedor)
        └─ WHATSAPP → fila whatsapp-dispatch (1 batch / cotação)
```

## O que fazer

### Schema
- Em `Quotation`: campo `reminderSentAt DateTime?` (idempotência — um lembrete por ciclo de vida da cotação).
- Migration Prisma.

### Fila intermediária
- Novo `TaskQueueName`: `remind-quotation` → rota `/api/tasks/remind-quotation`.
- Terraform: fila Cloud Tasks `remind-quotation` (rate moderado, similar a e-mail).

### QuotationService
- `enqueueDeadlineReminders()` (sem TenantContext, como `expireExpiredQuotations`):
  - `status: OPEN`
  - `deadline` entre início e fim de **amanhã** (fuso padrão do sistema — ver `common/utils/date.ts`)
  - pelo menos 1 `QuotationSupplier` com `responseStatus: PENDING`
  - `reminderSentAt: null`
  - para cada cotação: `enqueue('remind-quotation', { quotationId, tenantId }, { dedupeKey: remind:{id}:{YYYY-MM-DD} })`
- `sendDeadlineReminder(quotationId)`:
  - revalida OPEN + janela + `reminderSentAt`
  - carrega fornecedores `PENDING` **incluindo `channel`**
  - reutiliza `dispatchQuotationInvites` (já separa EMAIL vs WHATSAPP pelo canal da cotação) com flag de lembrete
  - seta `reminderSentAt` após enqueue bem-sucedido
  - **não** sobrescrever canal

### Worker endpoints (`CloudTasksGuard`)
- `POST /api/tasks/remind-pending-quotations` → scan (alvo do Scheduler)
- `POST /api/tasks/remind-quotation` → fan-out por cotação

### Templates
- Payload e-mail/WhatsApp: `kind: 'reminder' | 'invite'` (default `invite`).
- E-mail: subject/corpo *“Lembrete: a cotação encerra amanhã”*.
- WhatsApp: mensagem equivalente de prazo iminente.
- Limite Free de e-mail continua valendo; se estourar, logar e pular sem derrubar o lote.

### Infra (Terraform)
- Job `orcalink-remind-pending-quotations`: cron `0 9 * * *`, timezone do sistema, OIDC no worker (mesmo padrão de `expire_quotations`).
- Free tier do Scheduler: até 3 jobs (já existe 1 de expiração).

## Critérios de Aceite
- [ ] Cron diário às 9h dispara o scan no worker
- [ ] Só cotações OPEN com deadline na data civil de amanhã entram no lote
- [ ] Só fornecedores `PENDING` recebem lembrete
- [ ] Canal respeitado: `EMAIL` → fila de e-mail; `WHATSAPP` → fila de WhatsApp (mistura na mesma cotação ok)
- [ ] `reminderSentAt` + dedupe impedem reenvio no mesmo ciclo / mesmo dia
- [ ] Templates de lembrete distintos do convite inicial
- [ ] Testes unitários cobrem janela de data, idempotência, PENDING e canal

## Fora de Escopo
- UI de configuração (intervalo fixo: 1 dia antes)
- Segundo lembrete no mesmo ciclo de vida da cotação
- Broadcast em canal diferente do escolhido na cotação
- Alterar o reenvio manual (RF17) além de reutilizar o dispatch

## Refs
- PRD: P1 — Lembretes Automáticos; RF16, RF17; RNF05 (Cloud Tasks / Scheduler)
- Tasks: 15, 20, 23, 24
