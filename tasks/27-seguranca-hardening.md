# Task 27 — Segurança: Hardening (CORS, Secrets, Rate Limit, CSRF)

## Objetivo
Corrigir vulnerabilidades remanescentes da auditoria de segurança não cobertas pelas tasks #46–#49.

## Contexto
Issues existentes já cobrem:
- **#46** — Magic Link com token aleatório (S-001) ✅ **concluído**
- **#47** — Secrets em Terraform/Docker (S-002, S-012)
- **#48** — Isolamento multi-tenant no Resend/IDOR (S-006)
- **#49** — Sanitização HTML nos emails (S-007)

**Esta task cobre os gaps restantes com severidade crítico/alta/média.**

---

## 1. [CRÍTICO] CORS: remover fallback wildcard

**Arquivo:** `apps/api/src/main.ts:16-18`

```typescript
const allowedOrigins = process.env.APP_URL
  ? process.env.APP_URL.split(',').map((url) => url.trim())
  : true; // ← permite TODAS as origens se APP_URL não definido
```

### O que fazer
- Substituir fallback `true` por `false` (negar tudo) ou array vazio `[]`
- Em dev (`NODE_ENV=development`), fallback para `'*'` pode ser aceitável, mas sem `credentials: true`
- Adicionar validação no bootstrap: se `APP_URL` não estiver definida em produção, logar warning explícito

### Código esperado
```typescript
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.APP_URL
  ? process.env.APP_URL.split(',').map((url) => url.trim())
  : isProduction
    ? [] // produção: nega tudo se não configurado
    : ['http://localhost:5173']; // dev: permite Vite

if (allowedOrigins.length === 0 && isProduction) {
  console.warn('[SECURITY] APP_URL não configurada — CORS bloqueará todas as origens cross-origin');
}

app.enableCors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
});
```

### Critério de Aceite
- [ ] `APP_URL` vazia em produção → todas as origens cross-origin recebem erro CORS
- [ ] `APP_URL=https://meudominio.com` → apenas essa origem é permitida
- [ ] Dev local (`localhost:5173`) continua funcionando

---

## 2. [ALTO] Resend: remover API key mock

**Arquivo:** `apps/api/src/modules/mail/mail.service.ts:19`

```typescript
const rawKey = process.env['RESEND_API_KEY'] || 're_mock_key';
```

Emails falham silenciosamente se a env var não estiver configurada em produção.

### O que fazer
- Remover fallback `'re_mock_key'`
- Se `RESEND_API_KEY` não estiver definida, lançar erro no bootstrap (fail-fast) **apenas em produção**
- Em dev, permitir mock apenas com `NODE_ENV !== 'production'`

### Código esperado
```typescript
const rawKey = process.env['RESEND_API_KEY'];
if (!rawKey || rawKey === 're_mock_key') {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('RESEND_API_KEY é obrigatória em produção');
  }
  console.warn('[MAIL] Usando API key mock — emails NÃO serão enviados');
  this.resend = new Resend('re_mock_key');
} else {
  this.resend = new Resend(rawKey.trim());
}
```

### Critério de Aceite
- [ ] Produção sem `RESEND_API_KEY` → aplicação não sobe
- [ ] Dev sem `RESEND_API_KEY` → sobe com mock + warning no log
- [ ] `RESEND_API_KEY` configurado corretamente → emails funcionam

---

## 3. [MÉDIO] Rate Limit: isolamento por tenant

**Arquivo:** `apps/api/src/app.module.ts:27-32`

O `ThrottlerGuard` global compartilha 100 req/min entre **todos os tenants**. Um tenant com loop de erro ou ataque pode consumir a cota inteira, causando 429 para tenants legítimos.

### O que fazer
1. **Custom ThrottlerGuard**: estender `ThrottlerGuard` para usar `tenantId` como parte da chave de rate limit, isolando cotas por tenant
2. **Endpoints críticos por tenant com limites mais restritivos**:
   - `POST /quotations` → 30 req/min por tenant (criação de cotação)
   - `POST /suppliers` → 20 req/min por tenant (criação de fornecedor)
   - `POST /quotations/:id/publish` → 10 req/min por tenant (disparo de emails)

### Código esperado (guard customizado)
```typescript
// apps/api/src/common/guards/tenant-throttler.guard.ts
@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const tenantId = req.user?.tenantId || 'anonymous';
    const ip = req.ip;
    const route = req.route.path;
    return `tenant:${tenantId}:ip:${ip}:route:${route}`;
  }
}
```

### Critério de Aceite
- [ ] Tenant A faz 100 req/min → recebe 429
- [ ] Tenant B simultaneamente faz 100 req/min → recebe 200 (cotas isoladas)
- [ ] Rotas públicas (auth, portal) continuam com rate limit por IP (sem tenantId)
- [ ] Teste unitário comprovando isolamento com 2 tenants concorrentes

---

## 4. [MÉDIO] CSRF: proteção com `credentials: true`

**Arquivo:** `apps/api/src/main.ts:23`

CORS está configurado com `credentials: true`, o que permite envio de cookies cross-origin. Embora atualmente a autenticação seja stateless (Firebase JWT enviado via header `Authorization`), não há proteção CSRF. Se cookies de sessão forem introduzidos no futuro, abre-se um vetor de ataque.

### O que fazer
- **Opção recomendada**: Como a API é puramente stateless (JWT no header), remover `credentials: true` (não há cookies para enviar)
- **Alternativa**: Instalar `csurf` ou configurar token CSRF via header customizado (`X-CSRF-Token`) se cookies forem necessários no futuro
- Documentar no código a razão de `credentials: false` (ou true com CSRF)

### Código esperado
```typescript
app.enableCors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: false, // stateless JWT — sem cookies
});
```

### Critério de Aceite
- [ ] `credentials: false` ou token CSRF implementado
- [ ] Frontend continua autenticando via header `Authorization: Bearer <token>`
- [ ] Comentário no código explicando a decisão

---

## 5. [BAIXO] CSP: Content-Security-Policy customizado

**Arquivo:** `apps/api/src/main.ts:14`

Helmet é aplicado com defaults (sem CSP configurado). A API serve endpoints REST, não HTML — mas o worker pode servir respostas que são inspecionadas em logs.

### O que fazer
- Adicionar CSP restritivo: `default-src 'none'` (API REST não serve recursos)
- No nginx do frontend (`apps/web/nginx.conf`): adicionar headers de segurança (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)

### Código esperado
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));
```

### Critério de Aceite
- [ ] Headers de segurança presentes na resposta da API
- [ ] nginx.conf com X-Content-Type-Options, X-Frame-Options, Referrer-Policy

---

## 6. [BAIXO] Audit Log: registro de operações sensíveis

### O que fazer
- Criar interceptor ou decorator `@AuditLog('quotation.publish')` para registrar:
  - Quem (userId)
  - O quê (ação: publish, delete, create, resend)
  - Quando (timestamp)
  - Sobre qual recurso (quotationId, supplierId)
- Logar via `console.log` estruturado (JSON) para ser ingerido pelo Cloud Logging
- Cobrir: `POST /quotations/:id/publish`, `DELETE /quotations/:id`, `POST /quotations/:id/resend`, `POST /auth/register`

### Código esperado
```typescript
// apps/api/src/common/decorators/audit-log.decorator.ts
export const AUDIT_LOG_KEY = 'audit:action';

export const AuditLog = (action: string) => SetMetadata(AUDIT_LOG_KEY, action);

// apps/api/src/common/interceptors/audit-log.interceptor.ts
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const request = ctx.switchToHttp().getRequest();
    const action = this.reflector.get<string>(AUDIT_LOG_KEY, ctx.getHandler());
    if (action) {
      return next.handle().pipe(
        tap(() => {
          console.log(JSON.stringify({
            event: 'audit',
            action,
            userId: request.user?.userId,
            tenantId: request.user?.tenantId,
            resourceId: request.params?.id,
            timestamp: new Date().toISOString(),
          }));
        }),
      );
    }
    return next.handle();
  }
}
```

### Critério de Aceite
- [ ] Operações sensíveis geram log estruturado com userId, tenantId, ação, recurso
- [ ] Logs aparecem no stdout/Cloud Logging em formato JSON
- [ ] Não bloqueia a resposta em caso de falha no log

---

## Dependências
- Task 21 (Segurança) — concluída
- Tasks #46, #47, #48, #49 — em aberto

## Critérios de Aceite Gerais
- [ ] `npm run lint` passa sem erros
- [ ] `npm test` passa (testes unitários + e2e)
- [ ] `yarn dev` sobe sem crash
- [ ] Nenhum warning de segurança no console em produção

## Refs
- Auditoria de segurança: achados não cobertos por issues existentes
- `apps/api/src/main.ts:14-24` — CORS + Helmet
- `apps/api/src/modules/mail/mail.service.ts:19` — Resend mock key
- `apps/api/src/app.module.ts:27-32` — ThrottlerModule global
