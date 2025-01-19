###############################################################################
# Terraform Settings & Providers
###############################################################################
terraform {
  required_providers {
    google = {
      source = "hashicorp/google"
      # Matches the GKE module 35.x requirement: google >= 6.11.0, < 7.0.0
      version = "~> 6.16.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.10"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }

  # Not strictly required, but helpful
  required_version = ">= 1.0.0"
}

provider "google" {
  credentials = file(var.credentials_file)
  project     = var.project_id
  region      = var.region
}

# The kubernetes provider uses the GKE cluster endpoint. We'll configure
# it AFTER we create the cluster (by using data.google_client_config or
# module output).
provider "kubernetes" {
  host                   = "https://${module.gke.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(module.gke.ca_certificate)
}

# We also use the Helm provider to install the NGINX Ingress Controller chart
provider "helm" {
  # Same context as the Kubernetes provider
  kubernetes {
    host                   = "https://${module.gke.endpoint}"
    token                  = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(module.gke.ca_certificate)
  }
}

###############################################################################
# Variables
###############################################################################
variable "credentials_file" {
  type        = string
  description = "Path to the service account JSON key file"
}

variable "project_id" {
  type        = string
  description = "The GCP project ID where the cluster will be created"
}

variable "region" {
  type        = string
  description = "The region for the GKE cluster"
}

variable "cluster_name" {
  type        = string
  description = "Name of the GKE cluster"
}

variable "machine_type" {
  type        = string
  description = "The machine type for the GKE nodes"
}

variable "min_node_count" {
  type        = number
  description = "Minimum number of nodes in the node pool"
}

variable "max_node_count" {
  type        = number
  description = "Maximum number of nodes in the node pool"
}

variable "disk_size_gb" {
  type        = number
  description = "Size of the disk attached to each node, in GB"
}

###############################################################################
# Data Source: Current GCP Auth
###############################################################################
data "google_client_config" "default" {}

###############################################################################
# GKE Cluster Module
###############################################################################
module "gke" {
  source  = "terraform-google-modules/kubernetes-engine/google"
  version = "~> 35.0"

  project_id = var.project_id
  name       = var.cluster_name
  region     = var.region

  # If you have a custom VPC or subnetwork, set them here. Otherwise, "default".
  network    = "default"
  subnetwork = "default"

  # For a simple setup, skip custom secondary ranges
  ip_range_pods     = null
  ip_range_services = null

  # Remove the default (Google-managed) node pool
  remove_default_node_pool = true

  node_pools = [
    {
      name               = "default-node-pool"
      machine_type       = var.machine_type
      disk_type          = "pd-standard"
      disk_size_gb       = var.disk_size_gb
      image_type         = "COS_CONTAINERD"
      auto_repair        = true
      auto_upgrade       = true
      preemptible        = false
      initial_node_count = var.min_node_count

      # Enable autoscaling
      enable_autoscaling = true
      min_count          = var.min_node_count
      max_count          = var.max_node_count
    },
  ]
}

###############################################################################
# Helm: Install the NGINX Ingress Controller
###############################################################################
resource "helm_release" "nginx_ingress" {
  name             = "nginx-ingress"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  version          = "4.7.1" # or any stable version
  create_namespace = true
  namespace        = "ingress-nginx" # or "default"

  # Customize the helm chart if needed
  # set {
  #   name  = "controller.service.type"
  #   value = "LoadBalancer"
  # }
}

###############################################################################
# Deploy a WebSocket-Capable App (Example: basic NGINX)
###############################################################################
# Replace "nginx:latest" with your own container that can handle websockets
resource "kubernetes_deployment" "websocket_demo" {
  metadata {
    name      = "websocket-demo-deployment"
    namespace = "default"
    labels = {
      app = "websocket-demo"
    }
  }

  spec {
    replicas = 1
    selector {
      match_labels = {
        app = "websocket-demo"
      }
    }
    template {
      metadata {
        labels = {
          app = "websocket-demo"
        }
      }
      spec {
        container {
          name  = "websocket-demo"
          image = "nginx:1.27.3"

          # Expose a port (80). If your actual WebSocket server listens on, say, 8080,
          # update this containerPort accordingly.
          port {
            container_port = 80
          }
        }
      }
    }
  }

  depends_on = [module.gke, helm_release.nginx_ingress]
}

resource "kubernetes_service" "websocket_demo_svc" {
  metadata {
    name      = "websocket-demo-service"
    namespace = "default"
  }

  spec {
    selector = {
      app = "websocket-demo"
    }
    type = "ClusterIP"
    port {
      port        = 80
      target_port = 80
    }
  }

  depends_on = [module.gke, helm_release.nginx_ingress]
}

###############################################################################
# Ingress Resource
###############################################################################
# This Ingress uses annotations for the NGINX Ingress Controller
resource "kubernetes_ingress_v1" "websocket_demo_ingress" {
  metadata {
    name      = "websocket-demo-ingress"
    namespace = "default"

    annotations = {
      "kubernetes.io/ingress.class" = "nginx"
      # Optional: tweak timeouts for websockets, etc.
      # "nginx.ingress.kubernetes.io/proxy-read-timeout"  = "3600"
      # "nginx.ingress.kubernetes.io/proxy-send-timeout"  = "3600"
      # "nginx.ingress.kubernetes.io/websocket-services"  = "websocket-demo-service"
    }
  }

  spec {
    rule {
      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = kubernetes_service.websocket_demo_svc.metadata[0].name
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }

  depends_on = [module.gke, helm_release.nginx_ingress]
}

###############################################################################
# Outputs
###############################################################################
output "kubectl_command" {
  description = "Configure kubectl for this cluster"
  value       = "gcloud container clusters get-credentials ${var.cluster_name} --region ${var.region} --project ${var.project_id}"
}
