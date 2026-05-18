# Task 00 — Scaffold dos Projetos

## Objetivo
Criar a estrutura base dos projetos backend (NestJS) e frontend (React + Vite) com todas as dependências, configs e Docker Compose. Nenhuma lógica de negócio.

## O que fazer

### Backend (`apps/api/`)
1. Criar projeto NestJS via CLI: `nest new api --package-manager yarn --strict`
2. Instalar dependências:
   - `@nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt`
   - `@nestjs/bullmq bullmq`
   - `@nestjs/throttler`
   - `prisma @prisma/client`
   - `bcryptjs uuid helmet resend`
   - `class-validator class-transformer`
   - `zod`
   - `@types/passport-jwt @types/bcryptjs @types/uuid` (devDeps)
3. Inicializar Prisma: `npx prisma init`
4. Criar `.env.example`
5. Criar `Dockerfile` (multi-stage: node:20-alpine)

### Frontend (`apps/web/`)
1. Criar projeto Vite: `npm create vite@latest web -- --template react-ts`
2. Instalar dependências:
   - `react-router-dom axios lucide-react`
   - `react-hook-form @hookform/resolvers zod`
   - `@tanstack/react-query react-hot-toast`
3. Criar `src/styles/tokens.css` (variáveis do design system)
4. Criar `src/styles/reset.css` e `src/styles/global.css`
5. Criar `Dockerfile` (multi-stage: node → nginx:alpine)

### Root
1. Criar `docker-compose.yml` (postgres:16, redis:7, api, web)
2. Criar `docker-compose.dev.yml`
3. Criar `.env.example`
4. Atualizar `.gitignore`

## Critérios de Aceite
- [ ] `cd apps/api && yarn dev` → API sobe sem erros em `:3333`
- [ ] `cd apps/web && yarn dev` → Frontend sobe sem erros em `:5173`
- [ ] `npx prisma validate` → Schema válido (pode estar vazio)
- [ ] `docker compose config` → Compose válido sem erros
- [ ] Design tokens CSS carregam no frontend

## Refs
- PRD: RNF01, RNF02, RNF07
- Design: styles.md (seção 2-5)
