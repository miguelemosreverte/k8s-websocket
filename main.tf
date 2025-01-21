###############################################################################
# Terraform Settings & Providers
###############################################################################
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.16.0" # Matches the GKE module requirement
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.10"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.2"
    }
  }

  required_version = ">= 1.0.0"
}

provider "google" {
  credentials = file(var.credentials_file)
  project     = var.project_id
  region      = var.region
}

provider "kubernetes" {
  host                   = "https://${module.gke.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(module.gke.ca_certificate)
}

provider "helm" {
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
# Create GKE Cluster
###############################################################################
module "gke" {
  source  = "terraform-google-modules/kubernetes-engine/google"
  version = "~> 35.0"

  project_id = var.project_id
  name       = var.cluster_name
  region     = var.region

  network    = "default"
  subnetwork = "default"

  ip_range_pods     = null
  ip_range_services = null

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

      enable_autoscaling = true
      min_count          = var.min_node_count
      max_count          = var.max_node_count
    },
  ]
}

###############################################################################
# Helm: Install the NGINX Ingress Controller as a LoadBalancer
###############################################################################
resource "helm_release" "nginx_ingress" {
  name             = "nginx-ingress"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  version          = "4.7.1"
  create_namespace = true
  namespace        = "ingress-nginx"

  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }

  depends_on = [module.gke]
}

###############################################################################
# Deploy Your WebSocket Image & Ingress
###############################################################################
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
          image = "miguelemos/websocket:latest"

          port {
            container_port = 8080
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
      target_port = 8080
    }
  }

  depends_on = [module.gke, helm_release.nginx_ingress]
}

resource "kubernetes_ingress_v1" "websocket_demo_ingress" {
  metadata {
    name      = "websocket-demo-ingress"
    namespace = "default"
    annotations = {
      "kubernetes.io/ingress.class" = "nginx"
      # Enable WebSocket support explicitly
      "nginx.ingress.kubernetes.io/proxy-read-timeout" = "3600"
      "nginx.ingress.kubernetes.io/proxy-send-timeout" = "3600"
      "nginx.ingress.kubernetes.io/websocket-services" = "websocket-demo-service"
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
# Create a Local Kubeconfig File
###############################################################################
resource "local_file" "gke_kubeconfig" {
  filename = "kubeconfig.yaml"

  content = <<-EOT
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://${module.gke.endpoint}
    certificate-authority-data: ${module.gke.ca_certificate}
  name: ${var.cluster_name}
contexts:
- context:
    cluster: ${var.cluster_name}
    user: gke-user
  name: ${var.cluster_name}
current-context: ${var.cluster_name}
users:
- name: gke-user
  user:
    auth-provider:
      name: gcp
EOT

  depends_on = [module.gke]
}

###############################################################################
# Access the Ingress Controller's Service to get its External IP
###############################################################################
data "kubernetes_service" "ingress_nginx_controller" {
  metadata {
    name      = "nginx-ingress-ingress-nginx-controller"
    namespace = "ingress-nginx"
  }

  depends_on = [
    helm_release.nginx_ingress,
    kubernetes_deployment.websocket_demo,
    kubernetes_service.websocket_demo_svc,
    kubernetes_ingress_v1.websocket_demo_ingress
  ]
}

###############################################################################
# Materialize Outputs to File
###############################################################################
resource "local_file" "output_values" {
  filename = "cluster_output.txt"
  content  = <<-EOT
Cluster Access Information
=========================
Kubectl Command: ${format("gcloud container clusters get-credentials %s --region %s --project %s", var.cluster_name, var.region, var.project_id)}
Kubeconfig Path: ${local_file.gke_kubeconfig.filename}
Ingress Controller IP: ${try(data.kubernetes_service.ingress_nginx_controller.status[0].load_balancer[0].ingress[0].ip, "pending...")}
WebSocket Demo URL: ${try("http://${data.kubernetes_service.ingress_nginx_controller.status[0].load_balancer[0].ingress[0].ip}/", "URL will be available once the LoadBalancer IP is assigned...")}
EOT

  depends_on = [
    data.kubernetes_service.ingress_nginx_controller,
    local_file.gke_kubeconfig
  ]
}

###############################################################################
# Outputs
###############################################################################
output "kubectl_command" {
  description = "Configure kubectl using gcloud"
  value       = "gcloud container clusters get-credentials ${var.cluster_name} --region ${var.region} --project ${var.project_id}"
}

output "kubeconfig_path" {
  description = "Path to the local kubeconfig file"
  value       = local_file.gke_kubeconfig.filename
}

output "ingress_controller_ip" {
  description = "External IP of the NGINX Ingress Controller"
  value       = try(data.kubernetes_service.ingress_nginx_controller.status[0].load_balancer[0].ingress[0].ip, "pending...")
}

output "ingress_demo_url" {
  description = "Try this URL in your browser to access the WebSocket Demo"
  value       = try("http://${data.kubernetes_service.ingress_nginx_controller.status[0].load_balancer[0].ingress[0].ip}/", "URL will be available once the LoadBalancer IP is assigned...")
}
