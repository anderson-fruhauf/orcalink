# Orcalink — AGENTS.md

## Estado atual

Task 00 concluída: `apps/api/` (NestJS + Prisma) e `apps/web/` (React + Vite) scaffoldados com todas as dependências. Landing page em `landing/`, logotipos em `assets/logo/`.

## Arquitetura

- Monorepo simples (sem monorepo tool), estrutura:
  - `apps/api/` — NestJS + Prisma v7 + PostgreSQL + Redis (BullMQ)
  - `apps/web/` — React + Vite + TypeScript
  - `landing/` — Landing page estática
- **Multi-tenant** lógico via coluna `tenantId` em todas as tabelas
- Magic Links para fornecedores (sem cadastro)
- Planos: Free (limitado) e Pro (ilimitado)

## Stack

| Camada | Tech |
|--------|------|
| Backend | NestJS, TypeScript, Prisma v7, PostgreSQL, Redis, BullMQ, JWT, Resend |
| Frontend | React, Vite, TypeScript, react-router-dom, TanStack Query, react-hook-form + zod, lucide-react, react-hot-toast |
| Infra | Docker Compose (dev + prod), nginx (frontend prod) |

## Design system

Implementado em `apps/web/src/styles/tokens.css` (variáveis CSS), `reset.css`, `global.css` com fonte Inter + JetBrains Mono.

## Tasks

`tasks/README.md` lista 24 tasks numeradas (00→23). Implementar sequencialmente. Cada task tem critérios de aceite.

## Comandos

```bash
cd apps/api && yarn dev          # API em :3333
cd apps/web && npm run dev       # Frontend em :5173
npx prisma validate              # Validar schema (rodar de apps/api)
docker compose config            # Validar compose (rodar da raiz)
```

## Prisma v7

- O gerador `prisma-client` requer `output` explícito, definido como `../src/generated/prisma`
- Importar via `import { PrismaClient } from '../generated/prisma/client.js'` (ou criar barrel export)
- Gerado com: `npx prisma generate`

## Convenções

- Backend: NestJS modular (controllers, services, modules)
- Frontend: SPA com Vite, lazy routes por módulo
- Portas: API `:3333`, Web dev `:5173`
- Seed: Criar tenant + usuário admin no seed do Prisma
- `.env.example` na raiz e em `apps/api/`


leia orcalink.md para entender melhor o projeto
leia styles.md para entender melhor o design system
leia DEVELOPMENT_GUIDE.md para entender melhor como desenvolver