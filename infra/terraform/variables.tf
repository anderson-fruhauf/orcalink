variable "gcp_project_id" {
  type        = string
  description = "ID do projeto do Google Cloud / Firebase"
  default     = "orcalink-534b8"
}

variable "gcp_region" {
  type        = string
  description = "Região para deploy do Cloud Run e do Artifact Registry"
  default     = "us-central1"
}

variable "database_url" {
  type        = string
  description = "A URL de conexão com o banco de dados PostgreSQL (ex: Neon ou Supabase)"
  sensitive   = true
}

variable "container_image" {
  type        = string
  description = "Imagem publicada no Artifact Registry, usada pelos serviços de API e worker"
  default     = "us-central1-docker.pkg.dev/orcalink-534b8/orcalink-api/api:latest"
}

variable "worker_timeout_seconds" {
  type        = number
  description = "Timeout do worker — precisa acomodar o lote de WhatsApp com throttle entre mensagens"
  default     = 900
}

variable "jwt_secret" {
  type        = string
  description = "A chave secreta JWT para assinatura e validação dos tokens HMAC na API"
  sensitive   = true
  default     = "change-me-in-production-temporary-secret"
}

variable "resend_api_key" {
  type        = string
  description = "A chave de API do Resend para envio de e-mails"
  sensitive   = true
}

variable "resend_from_email" {
  type        = string
  description = "O e-mail de remetente configurado no Resend"
  default     = "onboarding@resend.dev"
}
