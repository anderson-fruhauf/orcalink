# Guia de Deploy — OrçaLink

Este guia orienta o deploy do OrçaLink em ambiente de produção em duas modalidades:
1. **Arquitetura Serverless Custo Zero (MVP)**: Google Cloud Run (API) + Firebase Hosting (Web) + Neon/Supabase (PostgreSQL) + Upstash (Redis).
2. **VPS Clássica (Docker Compose)**: Configuração autônoma em um único servidor Linux.

---

## Opção 1: Arquitetura Serverless Custo Zero (Recomendado para MVP)

Esta infraestrutura escala até zero instâncias quando inativa, reduzindo o custo operacional para **zero** em baixa utilização.

### 📋 Pré-requisitos
Antes de começar, certifique-se de ter instalado em sua máquina local:
* [Google Cloud CLI (gcloud)](https://cloud.google.com/sdk/docs/install)
* [Terraform](https://developer.hashicorp.com/terraform/downloads)
* [Firebase CLI](https://firebase.google.com/docs/cli#install_the_firebase_cli) (`npm install -g firebase-tools`)
* [Docker](https://www.docker.com/)

---

### Passo 1: Configurar Serviços Serverless de Terceiros

1. **PostgreSQL Serverless (Neon DB ou Supabase)**:
   * Crie uma conta em [Neon.tech](https://neon.tech/) ou [Supabase](https://supabase.com/).
   * Crie um projeto PostgreSQL gratuito.
   * Copie a Connection String (URI de conexão direta/pooling).
     * Exemplo: `postgresql://neondb_owner:senha@ep-nome-projeto.aws.neon.tech/neondb?sslmode=require`

2. **Redis Serverless (Upstash)**:
   * Crie uma conta em [Upstash](https://upstash.com/).
   * Crie um banco Redis (ative a opção SSL/TLS).
   * Copie a URL de conexão do Redis.
     * Exemplo: `rediss://default:token-secreto@nome-banco.upstash.io:6379`

---

### Passo 2: Provisionar Infraestrutura Google Cloud com Terraform

1. Faça login na sua conta Google Cloud pelo terminal:
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```
2. Defina o projeto atual no gcloud:
   ```bash
   gcloud config set project orcalink-534b8
   ```
3. Navegue até o diretório do Terraform:
   ```bash
   cd infra/terraform
   ```
4. Crie um arquivo `terraform.tfvars` para passar as credenciais confidenciais:
   ```hcl
   gcp_project_id = "orcalink-534b8"
   gcp_region     = "us-central1"
   database_url   = "SUA_CONNECTION_STRING_DO_NEON_OU_SUPABASE"
   redis_url      = "SUA_URL_DO_UPSTASH_REDIS"
   jwt_secret     = "UM_SEGREDO_JWT_COMPLEXO_E_ALEATORIO"
   ```
5. Inicialize e aplique o plano do Terraform:
   ```bash
   terraform init
   terraform apply
   ```
   *Digite `yes` quando solicitado para confirmar a criação.*
   *O Terraform criará o repositório no Artifact Registry e o serviço do Cloud Run inicialmente com um container de testes.*

---

### Passo 3: Build e Deploy da API (Cloud Run)

O deploy da API consiste em construir a imagem Docker localmente, enviá-la para o Artifact Registry criado e atualizar o serviço do Cloud Run.

1. Configure a autenticação do Docker com o Google Artifact Registry:
   ```bash
   gcloud auth configure-docker us-central1-docker.pkg.dev
   ```
2. No diretório raiz do OrçaLink, faça o build da API (use a URL do repositório gerada no output do Terraform):
   ```bash
   docker build -t us-central1-docker.pkg.dev/orcalink-534b8/orcalink-api/api:latest -f apps/api/Dockerfile apps/api
   ```
3. Envie a imagem para o Artifact Registry:
   ```bash
   docker push us-central1-docker.pkg.dev/orcalink-534b8/orcalink-api/api:latest
   ```
4. Atualize o serviço do Cloud Run para rodar com a nova imagem Docker:
   ```bash
   gcloud run deploy orcalink-api --image=us-central1-docker.pkg.dev/orcalink-534b8/orcalink-api/api:latest --region=us-central1
   ```

---

### Passo 4: Executar Migrations do Prisma

Para preparar a estrutura das tabelas no banco de dados remoto (Neon/Supabase):

1. Vá até o diretório `apps/api/`:
   ```bash
   cd apps/api
   ```
2. Configure temporariamente a variável `DATABASE_URL` no seu ambiente local (ou no `.env` de `apps/api/`) com a URL do banco remoto.
3. Execute o comando para aplicar as migrations:
   ```bash
   npx prisma migrate deploy
   ```

---

### Passo 5: Build e Deploy do Frontend (Firebase Hosting)

O Firebase Hosting hospedará os arquivos estáticos compilados e enviará as chamadas de `/api/*` diretamente para o Cloud Run provisionado.

1. Autentique-se no Firebase CLI:
   ```bash
   firebase login
   ```
2. No diretório raiz, configure o projeto padrão (se ainda não configurado):
   ```bash
   firebase use orcalink-534b8
   ```
3. Navegue até o frontend, crie um arquivo `.env.production` se necessário e realize o build:
   ```bash
   cd apps/web
   npm install
   npm run build
   ```
4. Volte para a raiz e envie para o Firebase Hosting:
   ```bash
   cd ../..
   firebase deploy --only hosting
   ```
   *O Firebase Hosting fornecerá o domínio HTTPS de produção do aplicativo (ex: `https://orcalink-534b8.web.app`). Toda requisição para `/api/*` será respondida pela API no Cloud Run sem problemas de CORS ou HTTPS misto.*

---

## Opção 2: Deploy Autônomo com Docker Compose (VPS Linux)

Se você preferir hospedar tudo em uma única máquina VPS (como DigitalOcean, AWS EC2, Hetzner, etc.), a stack completa pode ser orquestrada com Docker Compose.

### 📋 Pré-requisitos
* Um servidor Linux (Ubuntu/Debian recomendado).
* Docker e Docker Compose instalados no servidor.

### Passo 1: Configurar Variáveis de Ambiente
1. Copie o arquivo `.env.example` da API para `.env` no servidor:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```
2. Edite `apps/api/.env` definindo valores reais para produção:
   ```env
   DATABASE_URL=postgresql://orcalink:SENHA_FORTE@postgres:5432/orcalink
   REDIS_URL=redis://redis:6379
   JWT_SECRET=UM_SEGREDO_JWT_SUPER_SEGURO
   ```

### Passo 2: Subir a Stack
1. Execute o comando de inicialização na raiz do projeto:
   ```bash
   docker compose up -d --build
   ```
2. Verifique se os containers subiram corretamente:
   ```bash
   docker compose ps
   ```
3. Acompanhe os logs da API se necessário:
   ```bash
   docker compose logs -f api
   ```

A API estará exposta localmente na porta `3333` e o painel web estático do frontend rodará com Nginx de produção na porta `80`. Recomendamos colocar um Proxy Reverso (como Nginx Host, Traefik ou Cloudflare Tunnel) na frente para gerenciar os certificados SSL.
