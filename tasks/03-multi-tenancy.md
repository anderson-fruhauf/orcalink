# Task 03 — Multi-Tenancy Middleware

## Objetivo
Garantir isolamento de dados entre tenants em toda a API. Nenhuma query pode acessar dados de outro tenant.

## O que fazer

1. **TenantMiddleware** (`src/common/tenant.middleware.ts`):
   - Extrai `tenantId` do JWT (já disponível via JwtAuthGuard)
   - Injeta `req.tenantId` no request object
   - Aplicar globalmente em todas as rotas autenticadas

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

## Critérios de Aceite
- [ ] `@CurrentTenant()` retorna o tenantId correto em controllers
- [ ] Não é possível acessar dados de outro tenant via API
- [ ] Criar um user no tenant A e verificar que tenant B não o vê

## Refs
- PRD: RN04, RNF04
