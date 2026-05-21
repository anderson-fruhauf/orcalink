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

variable "redis_url" {
  type        = string
  description = "A URL de conexão do Redis Serverless (ex: Upstash)"
  sensitive   = true
  default     = ""
}

variable "jwt_secret" {
  type        = string
  description = "A chave secreta JWT para assinatura e validação dos tokens HMAC na API"
  sensitive   = true
  default     = "change-me-in-production-temporary-secret"
}
