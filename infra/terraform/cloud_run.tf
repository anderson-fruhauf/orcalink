resource "google_cloud_run_v2_service" "api" {
  name     = "orcalink-api"
  location = var.gcp_region
  project  = var.gcp_project_id
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      # Imagem placeholder inicial. Será atualizada no deploy da imagem real.
      image = "us-central1-docker.pkg.dev/orcalink-534b8/orcalink-api/api:latest"

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

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "DATABASE_URL"
        value = var.database_url
      }

      env {
        name  = "REDIS_URL"
        value = var.redis_url
      }

      env {
        name  = "JWT_SECRET"
        value = var.jwt_secret
      }

      env {
        name  = "RESEND_API_KEY"
        value = var.resend_api_key
      }

      env {
        name  = "RESEND_FROM_EMAIL"
        value = var.resend_from_email
      }
    }
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version
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
