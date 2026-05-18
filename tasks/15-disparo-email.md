# Task 15 — Disparo de E-mail (BullMQ + Resend)

## Objetivo
Enviar e-mails transacionais de forma assíncrona via fila.

## O que fazer

1. **Configurar BullMQ** com Redis (queue: `emails`)
2. **Producer**: ao publicar cotação ou reenviar, adicionar job na fila
3. **Consumer** (`EmailProcessor`): processa job e envia via Resend SDK
4. **Template**: e-mail HTML com:
   - Logo Orçalink no header (gradiente primary)
   - Nome da empresa do comprador
   - Título da cotação + prazo
   - Lista resumida de itens (max 5, depois "+X itens")
   - Botão CTA grande: "Enviar Proposta"
   - Footer com dados legais + link política de privacidade
5. **Tracking**: atualizar `sentAt` em `QuotationSupplier` após envio
6. **Limite**: verificar contagem de e-mails do mês vs limite do plano

## Critérios de Aceite
- [ ] E-mail enviado via fila (não bloqueia API)
- [ ] Template renderiza corretamente em clientes de e-mail
- [ ] `sentAt` atualizado após envio
- [ ] Limite de e-mails por mês respeitado (Free: 20)
- [ ] Retry com backoff exponencial em caso de falha

## Refs
- PRD: RF14, RNF05, RN05
- Integrações: seção 11 (Resend)
