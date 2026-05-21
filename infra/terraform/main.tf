terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# Repositório de imagens no Artifact Registry para a API do OrçaLink

resource "google_artifact_registry_repository" "orcalink_api" {
  location      = var.gcp_region
  repository_id = "orcalink-api"
  description   = "Docker repository for OrcaLink API"
  format        = "DOCKER"
}
