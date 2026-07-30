# Task 15 — Disparo de E-mail (Cloud Tasks + Resend)

## Objetivo
Enviar e-mails transacionais de forma assíncrona via fila gerenciada do Google Cloud Tasks.

> A infraestrutura da fila (filas, worker privado, guard OIDC, emulador local) está detalhada na
> **task 24**. Esta task cobre o produtor, o template e as regras de negócio do e-mail.

## O que fazer

1. **Producer**: ao publicar cotação ou reenviar, enfileirar uma task `email-dispatch` por
   `QuotationSupplier` (payload `{ tenantId, quotationSupplierId }`) — o request responde sem
   esperar o envio
2. **Handler** (`POST /api/tasks/email-dispatch` no worker): carrega a associação e envia via Resend SDK
3. **Template**: e-mail HTML com:
   - Logo Orçalink no header (gradiente primary)
   - Nome da empresa do comprador
   - Título da cotação + prazo
   - Lista resumida de itens (max 5, depois "+X itens")
   - Botão CTA grande: "Enviar Proposta"
   - Footer com dados legais + link política de privacidade
4. **Tracking**: atualizar `sentAt` e `dispatchStatus` em `QuotationSupplier` após envio
5. **Limite**: verificar contagem de e-mails do mês vs limite do plano — **antes de enfileirar**,
   ainda no request, para que o usuário veja o erro de limite na hora
6. **Idempotência**: se `sentAt` já estiver preenchido, o handler responde 200 sem reenviar

## Critérios de Aceite
- [ ] E-mail enviado via fila (não bloqueia API)
- [ ] Template renderiza corretamente em clientes de e-mail
- [ ] `sentAt` atualizado após envio
- [ ] Limite de e-mails por mês respeitado (Free: 20)
- [ ] Retry com backoff exponencial em caso de falha — configurado na fila, não em código
- [ ] Falha permanente marca `FAILED` e responde 200 (sem loop de retry)

## Refs
- PRD: RF14, RNF05, RN05
- Integrações: seção 11 (Resend + Cloud Tasks)
- Task 24: infraestrutura da fila assíncrona
