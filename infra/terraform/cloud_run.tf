data "google_project" "this" {
  project_id = var.gcp_project_id
}

locals {
  # URL determinística do Cloud Run v2. É calculada em vez de referenciada
  # (google_cloud_run_v2_service.worker.uri) porque o próprio worker precisa
  # conhecer sua URL para enfileirar tasks de fallback — referenciar o recurso
  # dentro dele mesmo criaria dependência circular no plan.
  worker_url = "https://orcalink-worker-${data.google_project.this.number}.${var.gcp_region}.run.app"

  common_env = {
    NODE_ENV                            = "production"
    DATABASE_URL                        = var.database_url
    JWT_SECRET                          = var.jwt_secret
    RESEND_API_KEY                      = var.resend_api_key
    RESEND_FROM_EMAIL                   = var.resend_from_email
    APP_URL                             = var.app_url
    GCP_PROJECT_ID                      = var.gcp_project_id
    GCP_LOCATION                        = var.gcp_region
    WORKER_URL                          = local.worker_url
    CLOUD_TASKS_INVOKER_SA              = google_service_account.tasks_invoker.email
    WHATSAPP_ENABLED                    = tostring(var.whatsapp_enabled)
    WHATSAPP_CREDENTIALS_ENCRYPTION_KEY = var.whatsapp_credentials_encryption_key
    WHATSAPP_SEND_THROTTLE_MS           = tostring(var.whatsapp_send_throttle_ms)
    WHATSAPP_CONNECT_TIMEOUT_MS         = tostring(var.whatsapp_connect_timeout_ms)
    WHATSAPP_PAIR_TIMEOUT_MS            = tostring(var.whatsapp_pair_timeout_ms)
  }
}

# Identidade de runtime da API: só ela pode enfileirar tasks
resource "google_service_account" "api" {
  account_id   = "orcalink-api"
  display_name = "Runtime da API do OrçaLink"
}

# Identidade usada pelo Cloud Tasks e pelo Cloud Scheduler para assinar o token
# OIDC das chamadas ao worker
resource "google_service_account" "tasks_invoker" {
  account_id   = "orcalink-tasks-invoker"
  display_name = "Invoker das filas e do scheduler do OrçaLink"
}

# O deploy contínuo do orcalink-api é feito pelo GitHub Actions
# (.github/workflows/deploy.yml), via `gcloud run deploy` a cada push na master —
# imagem com tag do commit-sha, env vars vindas de GitHub Secrets e labels de
# rastreio (commit-sha, managed-by). O Terraform só garante que o serviço existe,
# com a identidade e a rede corretas; ver `lifecycle.ignore_changes` abaixo para o
# que fica sob responsabilidade do CI.
resource "google_cloud_run_v2_service" "api" {
  name     = "orcalink-api"
  location = var.gcp_region
  project  = var.gcp_project_id
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.api.email

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = var.container_image

      ports {
        container_port = 3333
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true # CPU alocada apenas sob demanda para economizar custos
      }

      dynamic "env" {
        for_each = local.common_env
        content {
          name  = env.key
          value = env.value
        }
      }

      # Serviço público não expõe as rotas /api/tasks/*
      env {
        name  = "SERVICE_ROLE"
        value = "api"
      }
    }
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      # Gerenciados pelo GitHub Actions a cada push — ver comentário acima.
      template[0].containers[0].image,
      template[0].containers[0].env,
      template[0].labels,
    ]
  }
}

# Worker que processa as tasks. Privado: só a service account invoker alcança.
# O deploy contínuo (imagem + env) é feito pelo GitHub Actions
# (.github/workflows/deploy.yml) junto com a API — mesma imagem, SERVICE_ROLE=worker.
# O Terraform garante existência do serviço, ingress interno, timeout e IAM.
resource "google_cloud_run_v2_service" "worker" {
  name     = "orcalink-worker"
  location = var.gcp_region
  project  = var.gcp_project_id
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    # Mesma identidade da API: o worker também enfileira tasks (fallback de
    # WhatsApp para e-mail), então precisa da permissão de enqueuer.
    service_account = google_service_account.api.email
    timeout         = "${var.worker_timeout_seconds}s"

    scaling {
      min_instance_count = 0 # nada roda full-time: a fila acorda a instância
      max_instance_count = 5
    }

    containers {
      image = var.container_image

      ports {
        container_port = 3333
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        # O trabalho acontece dentro do request da task, então a CPU já está
        # alocada durante o processamento — não é preciso pagar CPU ociosa.
        cpu_idle = true
      }

      dynamic "env" {
        for_each = local.common_env
        content {
          name  = env.key
          value = env.value
        }
      }

      env {
        name  = "SERVICE_ROLE"
        value = "worker"
      }
    }
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      # Gerenciados pelo GitHub Actions a cada push — ver comentário acima.
      template[0].containers[0].image,
      template[0].containers[0].env,
      template[0].labels,
    ]
  }
}

# Permissão para que qualquer pessoa na internet possa invocar a API (allUsers -> roles/run.invoker)
resource "google_cloud_run_v2_service_iam_member" "api_public" {
  project  = var.gcp_project_id
  location = var.gcp_region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# O worker aceita chamadas apenas do Cloud Tasks / Cloud Scheduler
resource "google_cloud_run_v2_service_iam_member" "worker_invoker" {
  project  = var.gcp_project_id
  location = var.gcp_region
  name     = google_cloud_run_v2_service.worker.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.tasks_invoker.email}"
}
