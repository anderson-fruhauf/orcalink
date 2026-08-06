resource "google_project_service" "cloudtasks" {
  service            = "cloudtasks.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudscheduler" {
  service            = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
}

# Fila de e-mails: uma task por fornecedor, paralelismo alto e retry isolado.
resource "google_cloud_tasks_queue" "email_dispatch" {
  name     = "email-dispatch"
  location = var.gcp_region
  project  = var.gcp_project_id

  rate_limits {
    max_dispatches_per_second = 5
    max_concurrent_dispatches = 10
  }

  retry_config {
    max_attempts       = 5
    min_backoff        = "10s"
    max_backoff        = "300s"
    max_retry_duration = "3600s"
    max_doublings      = 4
  }

  # Registra CreateTask/DeleteTask/AttemptDispatch/AttemptResponse no Cloud Logging.
  # Retenção: 30 dias (padrão do bucket _Default; armazenamento além disso é cobrado).
  stackdriver_logging_config {
    sampling_ratio = 1.0
  }

  depends_on = [google_project_service.cloudtasks]
}

# Fila de WhatsApp: concorrência 1 funciona como lock distribuído, garantindo
# que nunca existam duas sessões Baileys abertas para o mesmo número.
resource "google_cloud_tasks_queue" "whatsapp_dispatch" {
  name     = "whatsapp-dispatch"
  location = var.gcp_region
  project  = var.gcp_project_id

  rate_limits {
    max_dispatches_per_second = 1
    max_concurrent_dispatches = 1
  }

  retry_config {
    max_attempts       = 3
    min_backoff        = "30s"
    max_backoff        = "600s"
    max_retry_duration = "3600s"
    max_doublings      = 3
  }

  # Registra CreateTask/DeleteTask/AttemptDispatch/AttemptResponse no Cloud Logging.
  # Retenção: 30 dias (padrão do bucket _Default; armazenamento além disso é cobrado).
  stackdriver_logging_config {
    sampling_ratio = 1.0
  }

  depends_on = [google_project_service.cloudtasks]
}

# A API enfileira tasks...
resource "google_project_iam_member" "api_tasks_enqueuer" {
  project = var.gcp_project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${google_service_account.api.email}"
}

# ...e precisa poder emitir o token OIDC em nome da SA invoker.
resource "google_service_account_iam_member" "api_uses_invoker" {
  service_account_id = google_service_account.tasks_invoker.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.api.email}"
}

# Expiração automática de cotações — substitui o cron do BullMQ (task 20).
resource "google_cloud_scheduler_job" "expire_quotations" {
  name        = "orcalink-expire-quotations"
  description = "Encerra cotações OPEN com prazo vencido"
  schedule    = "0 1 * * *"
  time_zone   = "America/Sao_Paulo"
  region      = var.gcp_region
  project     = var.gcp_project_id

  attempt_deadline = "320s"

  retry_config {
    retry_count = 3
  }

  http_target {
    http_method = "POST"
    uri         = "${local.worker_url}/api/tasks/expire-quotations"
    body        = base64encode("{}")

    headers = {
      "Content-Type" = "application/json"
    }

    oidc_token {
      service_account_email = google_service_account.tasks_invoker.email
      audience              = local.worker_url
    }
  }

  depends_on = [
    google_project_service.cloudscheduler,
    google_cloud_run_v2_service_iam_member.worker_invoker,
  ]
}
