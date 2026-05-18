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
- [ ] Headers de segurança presentes (verificar com securityheaders.com)
- [ ] CORS bloqueia origens não autorizadas
- [ ] Rate limit retorna 429 ao exceder
- [ ] DTOs rejeitam campos extras

## Refs
- PRD: RNF08
