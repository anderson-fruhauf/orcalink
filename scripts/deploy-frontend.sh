#!/usr/bin/env bash

# ==============================================================================
# Script de Deploy do Frontend (Web) — OrçaLink
# ==============================================================================
# Este script automatiza o deploy da SPA (Vite + React) do OrçaLink no Firebase
# Hosting, garantindo a compilação de produção com as variáveis corretas.
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

# 1. Carregar variáveis de ambiente do env.production do frontend se existir
ENV_PROD_PATH=""
if [ -f "apps/web/.env.production" ]; then
  ENV_PROD_PATH="apps/web/.env.production"
elif [ -f "apps/web/env.production" ]; then
  ENV_PROD_PATH="apps/web/env.production"
elif [ -f "../apps/web/.env.production" ]; then
  ENV_PROD_PATH="../apps/web/.env.production"
elif [ -f "../apps/web/env.production" ]; then
  ENV_PROD_PATH="../apps/web/env.production"
fi

if [ -n "$ENV_PROD_PATH" ]; then
  log_info "Carregando variáveis de ambiente de $ENV_PROD_PATH..."
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ ! "$line" =~ ^# ]] && [[ ! -z "${line//[:space:]/}" ]]; then
      key=$(echo "$line" | cut -d'=' -f1 | xargs)
      value=$(echo "$line" | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
      if [ -n "$key" ]; then
        export "$key"="$value"
      fi
    fi
  done < "$ENV_PROD_PATH"
fi

# Mapeia VITE_FIREBASE_PROJECT_ID para GCP_PROJECT_ID se estiver definido
if [ -n "${VITE_FIREBASE_PROJECT_ID:-}" ]; then
  GCP_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID"
fi

# Parâmetros configuráveis (com fallback)
GCP_PROJECT_ID="${GCP_PROJECT_ID:-orcalink-534b8}"

log_info "Iniciando deploy do Frontend (Web)..."
log_info "Configurações:"
log_info "  - Projeto Firebase/GCP: ${GCP_PROJECT_ID}"

# 2. Verificação de dependências
log_info "Validando ferramentas instaladas..."

if ! command -v firebase &> /dev/null; then
  log_error "Firebase CLI não está instalado. Execute 'npm install -g firebase-tools'. Abortando."
  exit 1
fi

if ! command -v npm &> /dev/null; then
  log_error "NPM não está instalado. O frontend utiliza NPM. Abortando."
  exit 1
fi

# 3. Configurar projeto Firebase
log_info "Configurando o projeto do Firebase..."
if ! firebase use "${GCP_PROJECT_ID}"; then
  log_warn "Não foi possível selecionar o projeto '${GCP_PROJECT_ID}' automaticamente. Verifique se realizou 'firebase login'."
  # Se falhar, tenta continuar caso o alias já esteja mapeado
fi

# 4. Build de produção do frontend
log_info "Instalando dependências e compilando o frontend (Vite)..."
(
  cd apps/web
  log_info "Executando 'npm install' em apps/web..."
  npm install
  
  log_info "Executando 'npm run build' em apps/web..."
  npm run build
)
log_success "Build do Frontend concluído com sucesso!"

# 5. Deploy no Firebase Hosting
log_info "Executando deploy para o Firebase Hosting..."
if ! firebase deploy --only hosting; then
  log_error "Falha ao realizar o deploy no Firebase Hosting."
  exit 1
fi

log_success "Deploy do Frontend concluído com sucesso!"
log_success "O aplicativo web está online!"
