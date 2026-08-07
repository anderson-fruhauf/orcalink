# Task 29 — Bug: Validação de limites na resposta do fornecedor

> **Tipo:** Bug  
> **Severidade:** Alta  
> **Camada:** Backend (+ Frontend)  
> **Depende de:** 17 (Portal Fornecedor Backend), 18 (Portal Frontend)

## Objetivo

Impedir que valores/prazos absurdos na proposta do fornecedor cheguem ao Prisma e gerem `500 Internal Server Error`. A API deve rejeitar com `400` e mensagem clara.

## Contexto / Evidência

Log de produção (`GlobalExceptionFilter`, correlation `84281def-…`):

```
POST /api/portal/{token}
PrismaClientValidationError:
  Unable to fit value 1.1111111111111111e+121 into a 64-bit signed integer
  for field `deliveryDays`

  unitPrice: 1.1111111111111111e+119
```

Causa: `SubmitProposalDto` / `ProposalItemDto` só validam `@IsInt` + `@Min(1)` — **sem `@Max`**. Números enormes passam no `class-validator` (ou chegam como float em notação científica) e quebram no `prisma.proposal.create()`.

### Arquivos relevantes
- `apps/api/src/modules/portal/dto/submit-proposal.dto.ts` — `deliveryDays`
- `apps/api/src/modules/portal/dto/proposal-item.dto.ts` — `priceInCents`
- `apps/api/prisma/schema.prisma` — `Proposal.deliveryDays Int?`, `ProposalItem.unitPrice Int`
- `apps/web/src/pages/PortalFornecedor.tsx` — inputs sem teto

## O que fazer

1. **Backend — tetos nos DTOs**
   - `deliveryDays`: `@Max` com limite de negócio razoável (ex.: 365 ou 999 dias)
   - `priceInCents`: `@Max` compatível com `Int` do Prisma/Postgres (máx. seguro ≤ `2_147_483_647`; preferir teto de negócio, ex. R$ 99.999.999,99 → `9_999_999_999` só se migrar para BigInt — caso contrário usar ≤ `2_147_483_647`)
   - Mensagens em português alinhadas ao restante dos DTOs

2. **Frontend — espelhar limites**
   - Validar no `PortalFornecedor` antes do submit (toast + bloqueio)
   - Atributos `max` / restrição nos inputs numéricos

3. **Testes**
   - Unitário: DTO / controller rejeita `deliveryDays` e `priceInCents` acima do teto com 400
   - Garantir que valores válidos no limite ainda passam

## Critérios de Aceite

- [ ] Proposta com `deliveryDays` ou `priceInCents` acima do limite → **400**, sem 500
- [ ] Mensagem de erro compreensível para o fornecedor
- [ ] Valores dentro do limite continuam salvando normalmente
- [ ] Frontend impede submit com valor/prazo fora do range
- [ ] Testes unitários cobrindo os casos de overflow

## Refs

- Log Cloud Logging: `PrismaClientValidationError` em `portal.service` → `proposal.create`
- Schema: `Proposal.deliveryDays`, `ProposalItem.unitPrice` como `Int`
