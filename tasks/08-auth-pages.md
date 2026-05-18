# Task 08 — Auth Pages (Frontend com Firebase)

## Objetivo
Implementar as telas de autenticação no frontend React utilizando o **Firebase Client SDK**.

## Setup
- Instalar `firebase` no frontend
- Criar `src/lib/firebase.ts` — inicializar app com config do Firebase Console
- Criar `src/hooks/useAuth.ts` — hook customizado com `onAuthStateChanged`, `getIdToken()`, user state
- Criar `src/contexts/AuthContext.tsx` — context provider que expõe user, loading, signIn, signUp, signOut

## Páginas

### `/login`
- Campos: email, senha
- Botão "Entrar" (btn-primary)
- Link "Esqueceu a senha?" → `/forgot-password`
- Link "Criar conta" → `/register`
- Ao submeter: `signInWithEmailAndPassword(auth, email, password)`
- Após login: obter ID token via `getIdToken()` → chamar `GET /auth/me` para validar user no backend
- Se user não existe no backend (404): redirecionar para `/register` com dados pré-preenchidos
- Redirecionar para `/dashboard` após login com sucesso

### `/register`
- Campos: nome, nome da empresa, email, senha, confirmar senha
- Validação com react-hook-form + zod
- Ao submeter:
  1. `createUserWithEmailAndPassword(auth, email, password)`
  2. `getIdToken()` do Firebase user
  3. `POST /auth/register` com `{ name, companyName }` + Bearer token
- Após registro: redirecionar para `/dashboard`

### `/forgot-password`
- Campo: email
- Ao submeter: `sendPasswordResetEmail(auth, email)`
- Mensagem de sucesso genérica (não revelar se email existe)
- **Nenhuma chamada ao backend** — Firebase gerencia todo o flow

## Gerenciamento de Token
- Usar `onAuthStateChanged` para detectar estado de login
- `getIdToken(user, true)` para forçar refresh quando necessário
- Armazenar ID token em memória (não localStorage) — Firebase SDK gerencia persistência
- Configurar axios interceptor para injetar `Authorization: Bearer <idToken>` em todas requests

## Especificações Visuais
- Layout centralizado (max-width: 440px)
- Card com shadow-lg, padding 40px
- Logo Orçalink no topo
- Background: neutral-50
- Inputs seguindo styles.md seção 6.2
- Botões seguindo styles.md seção 6.1
- Toast de erro via react-hot-toast

## Variáveis de Ambiente (Vite)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

## Critérios de Aceite
- [ ] Login funcional via Firebase
- [ ] Registro cria conta no Firebase + tenant/user no backend
- [ ] Esqueci a senha funciona via Firebase (sem backend)
- [ ] Token Firebase enviado automaticamente em todas requests à API
- [ ] Validação de formulários no client-side
- [ ] Tela responsiva (mobile ok)
- [ ] Redireciona para login se user não autenticado
- [ ] Sign-out funcional (limpa estado Firebase + redireciona)

## Refs
- PRD: RF01
- Design: styles.md seção 6.1, 6.2
- Firebase Web SDK: https://firebase.google.com/docs/auth/web/start
