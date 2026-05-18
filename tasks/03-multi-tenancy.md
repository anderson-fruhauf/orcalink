# Task 03 — Multi-Tenancy Middleware

## Objetivo
Garantir isolamento de dados entre tenants em toda a API. Nenhuma query pode acessar dados de outro tenant.

## O que fazer

1. **FirebaseAuthGuard já injeta `tenantId`** (implementado na task 02):
   - O guard verifica o Firebase ID Token
   - Faz lookup `firebaseUid → User` no Prisma
   - Injeta `{ userId, tenantId, email }` no `request.user`
   - O `tenantId` vem do banco de dados (não do token Firebase)

2. **Decorator `@CurrentTenant()`** (`src/common/decorators/current-tenant.decorator.ts`):
   - Param decorator que extrai `tenantId` do request
   - Uso: `@CurrentTenant() tenantId: string`

3. **Decorator `@CurrentUser()`**:
   - Param decorator que extrai user do request
   - Uso: `@CurrentUser() user: { userId, tenantId, email }`

4. **Regra obrigatória**:
   - Todo service que faz query no Prisma DEVE receber `tenantId` como parâmetro
   - Todo `findMany`, `findFirst`, `create`, `update`, `delete` DEVE incluir `where: { tenantId }`
   - Criar um helper ou Prisma extension para forçar isso

5. **Caching do lookup `firebaseUid → User`** (recomendado):
   - O `FirebaseAuthGuard` faz 1 query por request para resolver `tenantId`
   - Considerar cache in-memory (Map com TTL de 5min) para reduzir queries
   - Invalidar cache ao atualizar user

## Critérios de Aceite
- [ ] `@CurrentTenant()` retorna o tenantId correto em controllers
- [ ] Não é possível acessar dados de outro tenant via API
- [ ] Criar um user no tenant A e verificar que tenant B não o vê

## Refs
- PRD: RN04, RNF04
