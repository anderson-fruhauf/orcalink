# Task 02 — Autenticação (Firebase Auth)

## Objetivo
Implementar o módulo de autenticação utilizando **Firebase Authentication** como provedor de identidade, com verificação de tokens no backend via Firebase Admin SDK.

## O que fazer

### Configuração Firebase Admin SDK
- Instalar `firebase-admin` no backend
- Criar `FirebaseModule` (`src/firebase/firebase.module.ts`)
  - Inicializar Firebase Admin com service account key (env: `FIREBASE_SERVICE_ACCOUNT_PATH`)
  - Exportar `FirebaseAdminService` como provider global
- Adicionar `firebase-service-account.json` ao `.gitignore`

### FirebaseAuthGuard (`src/firebase/firebase-auth.guard.ts`)
- Implementar `CanActivate` do NestJS
- Extrair Bearer token do header `Authorization`
- Verificar token via `admin.auth().verifyIdToken(token)`
- Fazer lookup no Prisma: `User.findUnique({ where: { firebaseUid: decoded.uid } })`
- Injetar `{ userId, tenantId, email }` no `request.user`
- Retornar 401 se token inválido ou user não encontrado no BD

### Registro (POST /auth/register)
- Input: `{ name, companyName }` + Bearer token Firebase no header
- Verificar ID token → extrair `uid` e `email` do Firebase
- Validar que `firebaseUid` não existe no BD
- Criar `Tenant` com `companyName` e plano `FREE`
- Criar `User` vinculado ao tenant com `firebaseUid`
- Retornar dados do user e tenant

### Endpoint de perfil (GET /auth/me)
- Protegido por `FirebaseAuthGuard`
- Retorna dados do user + tenant autenticado

### O que NÃO implementar (Firebase cuida)
- ❌ Login endpoint — feito 100% no Firebase SDK (frontend)
- ❌ Recuperação de senha — `sendPasswordResetEmail()` no frontend
- ❌ Hash de senha — Firebase gerencia
- ❌ JWT customizado — Firebase gera os ID tokens

## Variáveis de Ambiente
```
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

## Critérios de Aceite
- [ ] `FirebaseModule` inicializa sem erros com service account válido
- [ ] `FirebaseAuthGuard` rejeita requests sem token (401)
- [ ] `FirebaseAuthGuard` rejeita tokens inválidos/expirados (401)
- [ ] POST `/auth/register` com token válido cria tenant + user
- [ ] POST `/auth/register` rejeita se `firebaseUid` já existe (409)
- [ ] GET `/auth/me` retorna dados do user + tenant
- [ ] Testes unitários com Firebase Admin SDK mockado

## Refs
- PRD: RF01
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup
- Verify ID tokens: https://firebase.google.com/docs/auth/admin/verify-id-tokens
