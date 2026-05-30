#!/usr/bin/env bash

# ==============================================================================
# Script de Deploy do Backend (API) — OrçaLink
# ==============================================================================
# Este script automatiza o deploy da API do OrçaLink no Google Cloud Run,
# incluindo o build da imagem Docker, o envio para o Artifact Registry e a
# execução opcional de migrations do Prisma no banco remoto.
# ==============================================================================

set -euo pipefail

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Sem cor

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Carregar variáveis de ambiente do env.production do backend se existir
ENV_PROD_PATH=""
if [ -f "apps/api/.env.production" ]; then
  ENV_PROD_PATH="apps/api/.env.production"
elif [ -f "apps/api/env.production" ]; then
  ENV_PROD_PATH="apps/api/env.production"
elif [ -f "../apps/api/.env.production" ]; then
  ENV_PROD_PATH="../apps/api/.env.production"
elif [ -f "../apps/api/env.production" ]; then
  ENV_PROD_PATH="../apps/api/env.production"
fi

ENV_VARS=""
if [ -n "$ENV_PROD_PATH" ]; then
  log_info "Carregando variáveis de ambiente de $ENV_PROD_PATH..."
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ ! "$line" =~ ^# ]] && [[ ! -z "${line//[:space:]/}" ]]; then
      key=$(echo "$line" | cut -d'=' -f1 | xargs)
      value=$(echo "$line" | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
      if [ -n "$key" ]; then
        export "$key"="$value"
        # Não enviar PORT ou FIREBASE_SERVICE_ACCOUNT_PATH
        if [ "$key" != "PORT" ] && [ "$key" != "FIREBASE_SERVICE_ACCOUNT_PATH" ]; then
          if [ -n "$ENV_VARS" ]; then
            ENV_VARS="${ENV_VARS}|${key}=${value}"
          else
            ENV_VARS="${key}=${value}"
          fi
        fi
      fi
    fi
  done < "$ENV_PROD_PATH"
fi

# Garante que NODE_ENV=production está definido
if [[ ! "$ENV_VARS" =~ "NODE_ENV=" ]]; then
  if [ -n "$ENV_VARS" ]; then
    ENV_VARS="NODE_ENV=production|${ENV_VARS}"
  else
    ENV_VARS="NODE_ENV=production"
  fi
fi

# Mapeia FIREBASE_PROJECT_ID para GCP_PROJECT_ID se estiver definido
if [ -n "${FIREBASE_PROJECT_ID:-}" ]; then
  GCP_PROJECT_ID="$FIREBASE_PROJECT_ID"
fi

# Parâmetros configuráveis (com fallback)
GCP_PROJECT_ID="${GCP_PROJECT_ID:-orcalink-534b8}"
GCP_REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-orcalink-api}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DOCKER_REGISTRY="${GCP_REGION}-docker.pkg.dev"
IMAGE_PATH="${DOCKER_REGISTRY}/${GCP_PROJECT_ID}/${SERVICE_NAME}/api:${IMAGE_TAG}"

log_info "Iniciando deploy do Backend (API)..."
log_info "Configurações:"
log_info "  - Projeto GCP: ${GCP_PROJECT_ID}"
log_info "  - Região GCP:  ${GCP_REGION}"
log_info "  - Serviço:      ${SERVICE_NAME}"
log_info "  - Imagem:       ${IMAGE_PATH}"

# 2. Verificação de dependências
log_info "Validando ferramentas instaladas..."

if ! command -v gcloud &> /dev/null; then
  log_error "Google Cloud CLI (gcloud) não está instalado. Abortando."
  exit 1
fi

if ! command -v docker &> /dev/null; then
  log_error "Docker não está instalado ou não está rodando. Abortando."
  exit 1
fi

if ! command -v yarn &> /dev/null; then
  log_error "Yarn não está instalado. O backend utiliza Yarn. Abortando."
  exit 1
fi

# 3. Autenticação no GCP & Docker Registry
log_info "Configurando autenticação do Docker com o Google Artifact Registry..."
if ! gcloud auth configure-docker "${DOCKER_REGISTRY}" --quiet; then
  log_error "Falha ao configurar a autenticação do Docker no Google Cloud."
  exit 1
fi

# 4. Compilação e Envio da Imagem Docker
log_info "Construindo imagem Docker localmente..."
if ! docker build -t "${IMAGE_PATH}" -f apps/api/Dockerfile apps/api; then
  log_error "Falha no build da imagem Docker do backend."
  exit 1
fi
log_success "Imagem Docker construída com sucesso."

log_info "Enviando imagem Docker para o Artifact Registry..."
if ! docker push "${IMAGE_PATH}"; then
  log_error "Falha ao enviar a imagem Docker para o registro."
  exit 1
fi
log_success "Imagem Docker enviada com sucesso."

# 5. Atualização do Serviço no Cloud Run
log_info "Realizando deploy do serviço '${SERVICE_NAME}' no Cloud Run..."
EXTRA_PARAMS=()
if [ -n "$ENV_VARS" ]; then
  EXTRA_PARAMS+=("--set-env-vars=^|^${ENV_VARS}")
fi

if ! gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE_PATH}" \
  --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" \
  "${EXTRA_PARAMS[@]}" \
  --quiet; then
  log_error "Falha ao atualizar o serviço no Cloud Run."
  exit 1
fi
log_success "Deploy concluído com sucesso no Cloud Run!"

# Obter URL do Cloud Run
API_URL=$(gcloud run services describe "${SERVICE_NAME}" --region="${GCP_REGION}" --project="${GCP_PROJECT_ID}" --format='value(status.url)' 2>/dev/null || echo "")
if [ -n "$API_URL" ]; then
  log_success "API disponível em: ${API_URL}"
fi

# 6. Prisma Migrations (Opcional)
echo ""
read -p "Deseja executar as migrations do Prisma no banco remoto agora? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
  # Verificar se a DATABASE_URL de produção já está em variáveis de ambiente
  if [ -z "${DATABASE_URL:-}" ]; then
    log_warn "A variável de ambiente DATABASE_URL não está definida."
    read -sp "Por favor, insira a Connection String do banco remoto (PostgreSQL): " INPUT_DB_URL
    echo ""
    if [ -n "$INPUT_DB_URL" ]; then
      export DATABASE_URL="$INPUT_DB_URL"
    else
      log_error "URL de banco de dados vazia. Pulando migrations."
      exit 0
    fi
  fi

  log_info "Executando migrations do Prisma no banco remoto..."
  # Executa prisma migrate deploy no diretório correspondente
  (
    cd apps/api
    npx prisma migrate deploy
  )
  log_success "Migrations do Prisma aplicadas com sucesso!"
else
  log_info "Prisma migrations ignoradas."
fi

log_success "Processo de Deploy do Backend concluído!"
