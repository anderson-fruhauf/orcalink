# Task 21 — Segurança (Rate Limit, CORS, Helmet)

## Objetivo
Hardening de segurança da API conforme RNF08.

## O que fazer

1. **Helmet**: headers de segurança (CSP, HSTS, X-Frame-Options)
2. **CORS**: permitir apenas `APP_URL` (configurável via env)
3. **Rate Limiting** (`@nestjs/throttler`):
   - Rotas autenticadas: 100 req/min por IP
   - Portal do fornecedor: 30 req/min por IP
   - Login/registro: 10 req/min por IP
4. **Proteção contra enumeração**: resposta genérica para magic links inválidos
5. **Validação global**: `ValidationPipe` com `whitelist: true, forbidNonWhitelisted: true`

## Critérios de Aceite
- [x] Headers de segurança presentes (verificar com securityheaders.com)
- [x] CORS bloqueia origens não autorizadas
- [x] Rate limit retorna 429 ao exceder
- [x] DTOs rejeitam campos extras

## Status
**Concluida** — 181 testes passando (172 unitarios + 9 e2e).

## Refs
- PRD: RNF08
