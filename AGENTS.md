# Orcalink — AGENTS.md

## Pacote manager split

- `apps/api/` usa **yarn**. `apps/web/` usa **npm**.
- Nao existe monorepo tool (workspaces, turbo, nx) — comandos rodam independentes por pasta.

## Prisma v7 (apps/api)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

- Importar com extensao `.js`: `import { PrismaClient } from '../generated/prisma/client.js'`
- Necessario por causa de `module: "nodenext"` no tsconfig.
- Schema separado do config: `prisma/schema.prisma` + `prisma.config.ts` (carrega `dotenv/config`).
- Migration `init` criada. User model usa `firebaseUid` (sem `passwordHash`).

## Comandos

```bash
cd apps/api && yarn dev              # NestJS em :3333 (hot reload)
cd apps/web && npm run dev           # Vite em :5173
cd apps/api && yarn test             # Jest unitario
cd apps/api && yarn test:e2e         # Jest E2E
cd apps/api && npx prisma migrate dev # Criar migrations
cd apps/api && npx prisma validate   # Validar schema
cd apps/api && npx prisma generate   # Gerar client
docker compose -f docker-compose.dev.yml up -d  # BD + Redis local
docker compose config                          # Validar compose
```

## Tasks

24 issues numeradas (00→23) em https://github.com/anderson-fruhauf/orcalink/issues. Sequenciais por dependencia. Cada issue tem criterios de aceite e refs ao PRD.

## Arquitetura

- **Autenticacao via Firebase Auth** — Firebase Client SDK no frontend, Firebase Admin SDK no backend.
  - Frontend: `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `sendPasswordResetEmail`.
  - Backend: `admin.auth().verifyIdToken(token)` no guard, lookup `firebaseUid → User → tenantId`.
  - Sem `passport`, sem `bcrypt`, sem JWT customizado.
  - Service account key em `firebase-service-account.json` (gitignored).
- Multi-tenant via coluna `tenantId` em toda tabela — toda query DEVE filtrar por `tenantId`.
- Magic Links sem cadastro para fornecedores (token HMAC).
- Planos Free (limitado) e Pro (ilimitado) — guard por recurso.
- Precos em **centavos** (`Int`) — nunca float/decimal.
- Filas BullMQ com Redis para disparo de email.
- Seed: 1 tenant + 1 admin (`admin@orcalink.com / 123456`) criado via Firebase Admin SDK.
- **Infraestrutura Custo Zero (MVP - Híbrida Scale-to-Zero)**:
  - **Servidor**: Cloud Run (min-instances: 0, CPU alocada sob demanda) + Firebase Hosting.
  - **PostgreSQL**: Supabase ou Neon DB (standby automático após inatividade).
  - **Redis/BullMQ**: Upstash (Redis Serverless).
  - **Migração**: 100% compatível com infra dedicada (Cloud SQL / Memorystore) ou VPS Docker alterando apenas as variáveis de ambiente (`DATABASE_URL` e `REDIS_URL`).

## Convencoes

- Backend: NestJS modular (`modules/category/`, `modules/quotation/`, etc). Cada modulo tem `module`, `controller`, `service`, `dto/`, `.spec.ts`.
- Frontend: lazy routes por modulo com React.lazy().
- API prefixo `/api` em todas as rotas.
- Paginacao obrigatoria: `{ data, meta: { total, page, limit, totalPages } }`.
- Precos como `priceInCents: Int` (ex: R$ 150,00 = 15000).
- Design tokens em `apps/web/src/styles/` — `tokens.css`, `reset.css`, `global.css`.

## Estado atual

Tasks 00 (scaffold) e 01 (schema + migration init) concluidas. Proximo passo: task 02 (Autenticacao Firebase). API e web compilam mas nao rodam sem PostgreSQL + Redis.

## Referencias

- `DEVELOPMENT_GUIDE.md` — TDD, SOLID, estrutura de modulos, convencoes de commit, checklist por task.
- `tasks/README.md` — visao geral das 24 tasks.
- `styles.md` — design system completo (cores, tipografia, espacamento, componentes).
- `orcalink-prd.md` — requisitos de produto (RFs, RNFs, RNs).
