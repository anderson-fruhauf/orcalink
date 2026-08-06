output "repository_url" {
  value       = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.orcalink_api.repository_id}"
  description = "A URL do repositório no Artifact Registry para a API"
}

output "api_service_url" {
  value       = google_cloud_run_v2_service.api.uri
  description = "A URL pública gerada para a API do Cloud Run"
}

output "worker_service_url" {
  value       = google_cloud_run_v2_service.worker.uri
  description = "A URL privada do worker que processa as tasks — deve bater com o WORKER_URL calculado"
}

output "task_queues" {
  value = [
    google_cloud_tasks_queue.email_dispatch.id,
    google_cloud_tasks_queue.whatsapp_dispatch.id,
  ]
  description = "Filas do Cloud Tasks usadas no disparo assíncrono"
}
