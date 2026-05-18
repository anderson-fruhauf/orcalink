# Task 01 — Schema Prisma + Migrations

## Objetivo
Definir o schema completo do banco de dados com todas as entidades do MVP e rodar a primeira migration.

## O que fazer

1. Editar `apps/api/prisma/schema.prisma` com as seguintes entidades:
   - `Tenant` (id, name, document, phone, plan, timestamps)
   - `User` (id, email, password, name, tenantId, timestamps)
   - `Category` (id, name, tenantId) — unique [name, tenantId]
   - `Product` (id, name, description, unit, internalCode, categoryId, tenantId)
   - `Supplier` (id, name, document, contactName, email, phone, tenantId)
   - `SupplierCategory` (supplierId, categoryId) — tabela pivot
   - `Quotation` (id, title, status, deadline, tenantId, timestamps)
   - `QuotationItem` (id, quantity, notes, productId, quotationId)
   - `QuotationSupplier` (id, token, status, quotationId, supplierId, sentAt, respondedAt)
   - `Proposal` (id, deliveryDays, paymentCondition, notes, quotationSupplierId)
   - `ProposalItem` (id, priceInCents, unavailable, proposalId, quotationItemId)

2. Enums:
   - `Plan`: FREE, PRO
   - `QuotationStatus`: DRAFT, OPEN, CLOSED
   - `SupplierResponseStatus`: PENDING, RESPONDED, EXPIRED

3. Regras importantes:
   - Preços em **centavos** (Int) — `priceInCents`
   - Token do magic link é `String @unique` em QuotationSupplier
   - `@@unique([quotationId, supplierId])` em QuotationSupplier
   - `@@unique([name, tenantId])` em Category
   - Todos os `tenantId` com `@relation` para `Tenant`

4. Rodar: `npx prisma migrate dev --name init`

5. Criar `prisma/seed.ts` com dados de exemplo:
   - 1 tenant, 1 user (admin@orcalink.com / 123456)
   - 3 categorias, 5 produtos, 3 fornecedores

6. Criar `PrismaService` e `PrismaModule` em `src/prisma/`

## Critérios de Aceite
- [ ] `npx prisma migrate dev` roda sem erros
- [ ] `npx prisma studio` abre e mostra todas as tabelas
- [ ] `npx prisma db seed` popula dados de exemplo
- [ ] PrismaService injeta corretamente no NestJS

## Refs
- PRD: RNF04 (PostgreSQL + Prisma), RN04 (tenantId), RN05 (planos)
- RF20: priceInCents justificativa
