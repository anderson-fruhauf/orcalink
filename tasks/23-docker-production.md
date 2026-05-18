# Task 23 — Docker Production

## Objetivo
Configurar Docker para deploy em produção (VPS Linux).

## O que fazer

1. **Dockerfile API** (multi-stage):
   - Stage 1: `node:20-alpine` — install deps + build
   - Stage 2: `node:20-alpine` — copy dist + node_modules prod only
   - CMD: `node dist/main.js`

2. **Dockerfile Web** (multi-stage):
   - Stage 1: `node:20-alpine` — install deps + `npm run build`
   - Stage 2: `nginx:alpine` — copy dist para `/usr/share/nginx/html`
   - Nginx config: SPA fallback (`try_files $uri /index.html`)

3. **docker-compose.yml** (produção):
   - Todos os serviços com `restart: unless-stopped`
   - PostgreSQL com volume nomeado
   - Redis com `--maxmemory 128mb --maxmemory-policy allkeys-lru`
   - API com health check
   - Web servido via nginx

4. **docker-compose.dev.yml** (desenvolvimento):
   - Bind mounts para hot reload
   - `command: yarn dev`
   - Ports expostas

5. **.dockerignore** para cada app

## Critérios de Aceite
- [ ] `docker compose up --build` sobe todos os serviços
- [ ] API responde em `localhost:3333/health`
- [ ] Frontend acessível em `localhost:5173`
- [ ] Volumes persistem dados do PostgreSQL
- [ ] Build de produção < 200MB por imagem

## Refs
- PRD: RNF07
