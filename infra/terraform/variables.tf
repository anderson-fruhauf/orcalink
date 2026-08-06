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

variable "app_url" {
  type        = string
  description = "URL pública do frontend (Firebase Hosting) — usada para montar o link do Magic Link"
  default     = "https://orcalink-534b8.web.app"
}

# WhatsApp (P1 — só usado pelo worker; o serviço público orcalink-api não processa tasks)
variable "whatsapp_enabled" {
  type        = bool
  description = "Feature flag do disparo por WhatsApp"
  default     = false
}

variable "whatsapp_credentials_encryption_key" {
  type        = string
  description = "Chave de criptografia das credenciais de sessão do WhatsApp em repouso"
  sensitive   = true
  default     = ""
}

variable "whatsapp_send_throttle_ms" {
  type        = number
  description = "Intervalo entre mensagens na mesma conexão WhatsApp"
  default     = 2000
}

variable "whatsapp_connect_timeout_ms" {
  type        = number
  description = "Timeout para estabelecer a sessão WhatsApp"
  default     = 15000
}

variable "whatsapp_pair_timeout_ms" {
  type        = number
  description = "Timeout para o pareamento por QR Code"
  default     = 120000
}
