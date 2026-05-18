# Task 02 — Autenticação (Register / Login / JWT)

## Objetivo
Implementar o módulo de autenticação completo: cadastro, login e proteção de rotas via JWT.

## O que fazer

### Registro (POST /auth/register)
- Input: `{ name, email, password, companyName }`
- Validar email único
- Hash da senha com bcryptjs (salt rounds: 10)
- Criar `Tenant` com `companyName` e plano `FREE`
- Criar `User` vinculado ao tenant
- Retornar JWT com `{ userId, tenantId, email }`

### Login (POST /auth/login)
- Input: `{ email, password }`
- Buscar user, comparar hash
- Retornar JWT + dados básicos do user e tenant

### JWT Strategy
- Configurar `@nestjs/passport` com `passport-jwt`
- Token contém: `userId`, `tenantId`, `email`
- Expiração: configurável via env (`JWT_EXPIRES_IN`, default 7d)
- Criar `JwtAuthGuard` para proteger rotas

### Recuperação de Senha (POST /auth/forgot-password + POST /auth/reset-password)
- Gerar token temporário (UUID, expira em 1h)
- Salvar hash do token no user (campo `resetToken`, `resetTokenExpiry`)
- Endpoint de reset valida token e atualiza senha

### Endpoint de perfil (GET /auth/me)
- Retorna dados do user + tenant autenticado

## Critérios de Aceite
- [ ] POST `/auth/register` cria tenant + user e retorna JWT
- [ ] POST `/auth/login` retorna JWT válido
- [ ] GET `/auth/me` com JWT retorna dados do user
- [ ] Rotas protegidas retornam 401 sem token
- [ ] Senha armazenada como hash (nunca plain text)
- [ ] JWT contém tenantId

## Refs
- PRD: RF01, RF02
