# pulumi-k8s-websocket
Pulumi | Kubernetes | Websocket

### HOW TO RUN LOCAL
`minikube start --driver=docker`

`sh script.local.deploy.sh`

```
sh script.local.deploy.sh
Building Docker image...
[+] Building 1.9s (11/11) FINISHED                                                                                                          docker:desktop-linux
 => [internal] load build definition from Dockerfile                                                                                                        0.0s
 => => transferring dockerfile: 148B                                                                                                                        0.0s
 => [internal] load metadata for docker.io/library/node:14                                                                                                  1.4s
 => [auth] library/node:pull token for registry-1.docker.io                                                                                                 0.0s
 => [internal] load .dockerignore                                                                                                                           0.0s
 => => transferring context: 2B                                                                                                                             0.0s
 => [1/5] FROM docker.io/library/node:14@sha256:a158d3b9b4e3fa813fa6c8c590b8f0a860e015ad4e59bbce5744d2f6fd8461aa                                            0.0s
 => => resolve docker.io/library/node:14@sha256:a158d3b9b4e3fa813fa6c8c590b8f0a860e015ad4e59bbce5744d2f6fd8461aa                                            0.0s
 => [internal] load build context                                                                                                                           0.1s
 => => transferring context: 1.05MB                                                                                                                         0.1s
 => CACHED [2/5] WORKDIR /app                                                                                                                               0.0s
 => CACHED [3/5] COPY package*.json ./                                                                                                                      0.0s
 => CACHED [4/5] RUN npm install                                                                                                                            0.0s
 => [5/5] COPY . .                                                                                                                                          0.1s
 => exporting to image                                                                                                                                      0.2s
 => => exporting layers                                                                                                                                     0.1s
 => => exporting manifest sha256:f2352894c06f43918db2187ce0bfcec96d749f588e562388ecb1a39120112531                                                           0.0s
 => => exporting config sha256:295da454e1049d51325ff728db4cf25171318ed0886edc8e5b2d96174d28f6f4                                                             0.0s
 => => exporting attestation manifest sha256:120a2178c7690ea71c6c34ff93fd14efe94322691247eb849d9b065dd97c557c                                               0.0s
 => => exporting manifest list sha256:cb7d14691ac028ac581c4686977fa2eecf980fea9bcfde1159653e5b6325d485                                                      0.0s
 => => naming to docker.io/library/chat-app:v1                                                                                                              0.0s
 => => unpacking to docker.io/library/chat-app:v1                                                                                                           0.1s
Loading image into Minikube...
Applying Kubernetes manifests...
deployment.apps/chat-app unchanged
service/chat-app unchanged
Waiting for deployment to be ready...
deployment "chat-app" successfully rolled out
Getting service URL...
http://127.0.0.1:55566
❗  Because you are using a Docker driver on darwin, the terminal needs to be open to run it.

```

![image](https://github.com/user-attachments/assets/40678070-4a4f-4636-ae34-c3d27ff39345)


`sh script.local.teardown.sh`

```
sh script.local.teardown.sh
Deleting Kubernetes resources...
service "chat-app" deleted
deployment.apps "chat-app" deleted
Removing Docker image from Minikube...
85d2c0713386
Untagged: chat-app:v1
Deleted: sha256:65fd22c19056e9a78124d5affb2a609576ffca9d17c1882b1fce36eb7af9ba4c
Deleted: sha256:5e4ed9414b44971b20efb49a876303c7f1fdd2117055bc77f4e71627c5d1c12a
Deleted: sha256:b6513484eda5cc26841625b4cc2846a341716b27cae3c19b349cc0d0bdc3ca5c
Deleted: sha256:d3af7c2fd3c8781ef9a071e19ff9585563549a066a6b21b0fa2e5d87a241d5b9
Deleted: sha256:a9130e43d44421561a5e4c9c1782046c93dc7b58bfd57d29c52db8d8af29f2a3
Deleted: sha256:f69d6bf00a1c472f6472be8eba1d3dc396b816d688baa60dbad81240a5f14c43
Deleted: sha256:5b6a27cef4553269c42631db5e9653eceb4766a6d8370cb3dbf1b4d29e3180bc
Deleted: sha256:02cbdc3d81cb2a7d947c13d6698e06b70d16dad3a04f2519256f79b891e8ddd8
Deleted: sha256:6107490ef2a1e69410254464af66ddd0311b4d6334d9d65190ceb95ae9cc9d64
Deleted: sha256:fbdf3ab94318785d8321f27ec857e75b4d7113642e5956548428e4218fbef7a9
Deleted: sha256:80bdb74df15a59fa9577d151dde713466a08830a37c4c4351dc329e196205ac0
Deleted: sha256:f1d41a64e19a07475d4aadc7d5a3dcfe0d5c8c72fab4895acc29578c78284c7f
Deleted: sha256:32a2a6e1d286c920e403f1606cbf11c296467e34e19d53900dd82a8197349266
Deleted: sha256:173621e7addd9a122d7aa8c00c6741b6b4426b7b76d65cd26e33c42defc8f4d9
Teardown complete.
```


##### HOW TO RUN REMOTE

`sh script.remote.deploy.gcloud.sh`

```
terraform apply
data.google_client_config.default: Reading...
module.gke.data.google_container_engine_versions.region: Reading...
module.gke.data.google_compute_zones.available[0]: Reading...
data.google_client_config.default: Read complete after 0s [id=projects/developer-test-02/regions/us-central1/zones/]
module.gke.data.google_compute_zones.available[0]: Read complete after 1s [id=projects/developer-test-02/regions/us-central1]
module.gke.data.google_container_engine_versions.zone: Reading...
module.gke.data.google_container_engine_versions.region: Read complete after 1s [id=2025-01-21 05:53:56.104834 +0000 UTC]
module.gke.data.google_container_engine_versions.zone: Read complete after 1s [id=2025-01-21 05:53:56.583857 +0000 UTC]

Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # helm_release.nginx_ingress will be created
  + resource "helm_release" "nginx_ingress" {
      + atomic                     = false
      + chart                      = "ingress-nginx"
      + cleanup_on_fail            = false
      + create_namespace           = true
      + dependency_update          = false
      + disable_crd_hooks          = false
      + disable_openapi_validation = false
      + disable_webhooks           = false
      + force_update               = false
      + id                         = (known after apply)
      + lint                       = false
      + manifest                   = (known after apply)
      + max_history                = 0
      + metadata                   = (known after apply)
      + name                       = "nginx-ingress"
      + namespace                  = "ingress-nginx"
      + pass_credentials           = false
      + recreate_pods              = false
      + render_subchart_notes      = true
      + replace                    = false
      + repository                 = "https://kubernetes.github.io/ingress-nginx"
      + reset_values               = false
      + reuse_values               = false
      + skip_crds                  = false
      + status                     = "deployed"
      + timeout                    = 300
      + verify                     = false
      + version                    = "4.7.1"
      + wait                       = true
      + wait_for_jobs              = false
    }

  # kubernetes_deployment.websocket_demo will be created
  + resource "kubernetes_deployment" "websocket_demo" {
      + id               = (known after apply)
      + wait_for_rollout = true

      + metadata {
          + generation       = (known after apply)
          + labels           = {
              + "app" = "websocket-demo"
            }
          + name             = "websocket-demo-deployment"
          + namespace        = "default"
          + resource_version = (known after apply)
          + uid              = (known after apply)
        }

      + spec {
          + min_ready_seconds         = 0
          + paused                    = false
          + progress_deadline_seconds = 600
          + replicas                  = "1"
          + revision_history_limit    = 10

          + selector {
              + match_labels = {
                  + "app" = "websocket-demo"
                }
            }

          + template {
              + metadata {
                  + generation       = (known after apply)
                  + labels           = {
                      + "app" = "websocket-demo"
                    }
                  + name             = (known after apply)
                  + resource_version = (known after apply)
                  + uid              = (known after apply)
                }
              + spec {
                  + automount_service_account_token  = true
                  + dns_policy                       = "ClusterFirst"
                  + enable_service_links             = true
                  + host_ipc                         = false
                  + host_network                     = false
                  + host_pid                         = false
                  + hostname                         = (known after apply)
                  + node_name                        = (known after apply)
                  + restart_policy                   = "Always"
                  + scheduler_name                   = (known after apply)
                  + service_account_name             = (known after apply)
                  + share_process_namespace          = false
                  + termination_grace_period_seconds = 30

                  + container {
                      + image                      = "miguelemos/websocket:latest"
                      + image_pull_policy          = (known after apply)
                      + name                       = "websocket-demo"
                      + stdin                      = false
                      + stdin_once                 = false
                      + termination_message_path   = "/dev/termination-log"
                      + termination_message_policy = (known after apply)
                      + tty                        = false

                      + port {
                          + container_port = 8080
                          + protocol       = "TCP"
                        }
                    }
                }
            }
        }
    }

  # kubernetes_ingress_v1.websocket_demo_ingress will be created
  + resource "kubernetes_ingress_v1" "websocket_demo_ingress" {
      + id     = (known after apply)
      + status = (known after apply)

      + metadata {
          + annotations      = {
              + "kubernetes.io/ingress.class" = "nginx"
            }
          + generation       = (known after apply)
          + name             = "websocket-demo-ingress"
          + namespace        = "default"
          + resource_version = (known after apply)
          + uid              = (known after apply)
        }

      + spec {
          + ingress_class_name = (known after apply)

          + rule {
              + http {
                  + path {
                      + path      = "/"
                      + path_type = "Prefix"

                      + backend {
                          + service {
                              + name = "websocket-demo-service"

                              + port {
                                  + number = 80
                                }
                            }
                        }
                    }
                }
            }
        }
    }

  # kubernetes_service.websocket_demo_svc will be created
  + resource "kubernetes_service" "websocket_demo_svc" {
      + id                     = (known after apply)
      + status                 = (known after apply)
      + wait_for_load_balancer = true

      + metadata {
          + generation       = (known after apply)
          + name             = "websocket-demo-service"
          + namespace        = "default"
          + resource_version = (known after apply)
          + uid              = (known after apply)
        }

      + spec {
          + allocate_load_balancer_node_ports = true
          + cluster_ip                        = (known after apply)
          + cluster_ips                       = (known after apply)
          + external_traffic_policy           = (known after apply)
          + health_check_node_port            = (known after apply)
          + internal_traffic_policy           = (known after apply)
          + ip_families                       = (known after apply)
          + ip_family_policy                  = (known after apply)
          + publish_not_ready_addresses       = false
          + selector                          = {
              + "app" = "websocket-demo"
            }
          + session_affinity                  = "None"
          + type                              = "ClusterIP"

          + port {
              + node_port   = (known after apply)
              + port        = 80
              + protocol    = "TCP"
              + target_port = "8080"
            }
        }
    }

  # module.gke.google_container_cluster.primary will be created
  + resource "google_container_cluster" "primary" {
      + cluster_ipv4_cidr                        = (known after apply)
      + datapath_provider                        = (known after apply)
      + default_max_pods_per_node                = 110
      + deletion_protection                      = true
      + effective_labels                         = {
          + "goog-terraform-provisioned" = "true"
        }
      + enable_cilium_clusterwide_network_policy = false
      + enable_fqdn_network_policy               = false
      + enable_intranode_visibility              = false
      + enable_kubernetes_alpha                  = false
      + enable_l4_ilb_subsetting                 = false
      + enable_legacy_abac                       = false
      + enable_multi_networking                  = false
      + enable_shielded_nodes                    = true
      + enable_tpu                               = false
      + endpoint                                 = (known after apply)
      + id                                       = (known after apply)
      + label_fingerprint                        = (known after apply)
      + location                                 = "us-central1"
      + logging_service                          = "logging.googleapis.com/kubernetes"
      + master_version                           = (known after apply)
      + monitoring_service                       = "monitoring.googleapis.com/kubernetes"
      + name                                     = "my-gke-cluster-pulumi"
      + network                                  = "projects/developer-test-02/global/networks/default"
      + networking_mode                          = (known after apply)
      + node_locations                           = (known after apply)
      + node_version                             = (known after apply)
      + operation                                = (known after apply)
      + private_ipv6_google_access               = (known after apply)
      + project                                  = "developer-test-02"
      + remove_default_node_pool                 = true
      + self_link                                = (known after apply)
      + services_ipv4_cidr                       = (known after apply)
      + subnetwork                               = "projects/developer-test-02/regions/us-central1/subnetworks/default"
      + terraform_labels                         = {
          + "goog-terraform-provisioned" = "true"
        }
      + tpu_ipv4_cidr_block                      = (known after apply)

      + addons_config {
          + config_connector_config {
              + enabled = false
            }
          + dns_cache_config {
              + enabled = false
            }
          + gce_persistent_disk_csi_driver_config {
              + enabled = true
            }
          + gcp_filestore_csi_driver_config {
              + enabled = false
            }
          + gke_backup_agent_config {
              + enabled = false
            }
          + horizontal_pod_autoscaling {
              + disabled = false
            }
          + http_load_balancing {
              + disabled = false
            }
          + network_policy_config {
              + disabled = true
            }
        }

      + cluster_autoscaling {
          + auto_provisioning_locations = (known after apply)
          + autoscaling_profile         = "BALANCED"
          + enabled                     = false
        }

      + database_encryption {
          + state = "DECRYPTED"
        }

      + default_snat_status {
          + disabled = false
        }

      + identity_service_config {
          + enabled = false
        }

      + ip_allocation_policy {
          + cluster_ipv4_cidr_block       = (known after apply)
          + cluster_secondary_range_name  = (known after apply)
          + services_ipv4_cidr_block      = (known after apply)
          + services_secondary_range_name = (known after apply)
          + stack_type                    = "IPV4"
        }

      + maintenance_policy {
          + daily_maintenance_window {
              + duration   = (known after apply)
              + start_time = "05:00"
            }
        }

      + master_auth {
          + client_certificate     = (known after apply)
          + client_key             = (sensitive value)
          + cluster_ca_certificate = (known after apply)

          + client_certificate_config {
              + issue_client_certificate = false
            }
        }

      + mesh_certificates {
          + enable_certificates = false
        }

      + network_policy {
          + enabled = false
        }

      + node_pool {
          + initial_node_count          = 0
          + instance_group_urls         = (known after apply)
          + managed_instance_group_urls = (known after apply)
          + max_pods_per_node           = (known after apply)
          + name                        = "default-pool"
          + name_prefix                 = (known after apply)
          + node_count                  = (known after apply)
          + node_locations              = (known after apply)
          + version                     = (known after apply)

          + management {
              + auto_repair  = true
              + auto_upgrade = true
            }

          + node_config {
              + disk_size_gb                = (known after apply)
              + disk_type                   = (known after apply)
              + effective_taints            = (known after apply)
              + enable_confidential_storage = false
              + image_type                  = "COS_CONTAINERD"
              + labels                      = (known after apply)
              + local_ssd_count             = (known after apply)
              + logging_variant             = "DEFAULT"
              + machine_type                = "e2-medium"
              + metadata                    = (known after apply)
              + min_cpu_platform            = (known after apply)
              + oauth_scopes                = (known after apply)
              + preemptible                 = false
              + service_account             = (known after apply)
              + spot                        = false
              + tags                        = [
                  + "gke-my-gke-cluster-pulumi",
                  + "gke-my-gke-cluster-pulumi-default-pool",
                ]

              + shielded_instance_config {
                  + enable_integrity_monitoring = true
                  + enable_secure_boot          = false
                }

              + workload_metadata_config {
                  + mode = "GKE_METADATA"
                }
            }
        }

      + node_pool_defaults {
          + node_config_defaults {
              + insecure_kubelet_readonly_port_enabled = (known after apply)
              + logging_variant                        = (known after apply)

              + gcfs_config {
                  + enabled = false
                }
            }
        }

      + notification_config {
          + pubsub {
              + enabled = false
            }
        }

      + release_channel {
          + channel = "REGULAR"
        }

      + security_posture_config {
          + mode               = "DISABLED"
          + vulnerability_mode = "VULNERABILITY_DISABLED"
        }

      + timeouts {
          + create = "45m"
          + delete = "45m"
          + update = "45m"
        }

      + vertical_pod_autoscaling {
          + enabled = false
        }

      + workload_identity_config {
          + workload_pool = "developer-test-02.svc.id.goog"
        }
    }

  # module.gke.google_container_node_pool.pools["default-node-pool"] will be created
  + resource "google_container_node_pool" "pools" {
      + cluster                     = "my-gke-cluster-pulumi"
      + id                          = (known after apply)
      + initial_node_count          = 1
      + instance_group_urls         = (known after apply)
      + location                    = "us-central1"
      + managed_instance_group_urls = (known after apply)
      + max_pods_per_node           = (known after apply)
      + name                        = "default-node-pool"
      + name_prefix                 = (known after apply)
      + node_count                  = (known after apply)
      + node_locations              = (known after apply)
      + operation                   = (known after apply)
      + project                     = "developer-test-02"
      + version                     = (known after apply)

      + autoscaling {
          + location_policy = (known after apply)
          + max_node_count  = 3
          + min_node_count  = 1
        }

      + management {
          + auto_repair  = true
          + auto_upgrade = true
        }

      + node_config {
          + disk_size_gb                = 100
          + disk_type                   = "pd-standard"
          + effective_taints            = (known after apply)
          + enable_confidential_storage = false
          + image_type                  = "COS_CONTAINERD"
          + labels                      = {
              + "cluster_name" = "my-gke-cluster-pulumi"
              + "node_pool"    = "default-node-pool"
            }
          + local_ssd_count             = 0
          + logging_variant             = "DEFAULT"
          + machine_type                = "e2-medium"
          + metadata                    = {
              + "cluster_name"             = "my-gke-cluster-pulumi"
              + "disable-legacy-endpoints" = "true"
              + "node_pool"                = "default-node-pool"
            }
          + min_cpu_platform            = (known after apply)
          + oauth_scopes                = [
              + "https://www.googleapis.com/auth/cloud-platform",
            ]
          + preemptible                 = false
          + service_account             = (known after apply)
          + spot                        = false
          + tags                        = [
              + "gke-my-gke-cluster-pulumi",
              + "gke-my-gke-cluster-pulumi-default-node-pool",
            ]

          + shielded_instance_config {
              + enable_integrity_monitoring = true
              + enable_secure_boot          = false
            }

          + workload_metadata_config {
              + mode = "GKE_METADATA"
            }
        }

      + timeouts {
          + create = "45m"
          + delete = "45m"
          + update = "45m"
        }

      + upgrade_settings {
          + max_surge       = 1
          + max_unavailable = 0
          + strategy        = "SURGE"
        }
    }

  # module.gke.google_project_iam_member.cluster_service_account_metric_writer[0] will be created
  + resource "google_project_iam_member" "cluster_service_account_metric_writer" {
      + etag    = (known after apply)
      + id      = (known after apply)
      + member  = (known after apply)
      + project = "developer-test-02"
      + role    = "roles/monitoring.metricWriter"
    }

  # module.gke.google_project_iam_member.cluster_service_account_node_service_account[0] will be created
  + resource "google_project_iam_member" "cluster_service_account_node_service_account" {
      + etag    = (known after apply)
      + id      = (known after apply)
      + member  = (known after apply)
      + project = "developer-test-02"
      + role    = "roles/container.defaultNodeServiceAccount"
    }

  # module.gke.google_project_iam_member.cluster_service_account_resource_metadata_writer[0] will be created
  + resource "google_project_iam_member" "cluster_service_account_resource_metadata_writer" {
      + etag    = (known after apply)
      + id      = (known after apply)
      + member  = (known after apply)
      + project = "developer-test-02"
      + role    = "roles/stackdriver.resourceMetadata.writer"
    }

  # module.gke.google_service_account.cluster_service_account[0] will be created
  + resource "google_service_account" "cluster_service_account" {
      + account_id   = (known after apply)
      + disabled     = false
      + display_name = "Terraform-managed service account for cluster my-gke-cluster-pulumi"
      + email        = (known after apply)
      + id           = (known after apply)
      + member       = (known after apply)
      + name         = (known after apply)
      + project      = "developer-test-02"
      + unique_id    = (known after apply)
    }

  # module.gke.random_shuffle.available_zones[0] will be created
  + resource "random_shuffle" "available_zones" {
      + id           = (known after apply)
      + input        = [
          + "us-central1-a",
          + "us-central1-b",
          + "us-central1-c",
          + "us-central1-f",
        ]
      + result       = (known after apply)
      + result_count = 3
    }

  # module.gke.random_string.cluster_service_account_suffix[0] will be created
  + resource "random_string" "cluster_service_account_suffix" {
      + id          = (known after apply)
      + length      = 4
      + lower       = true
      + min_lower   = 0
      + min_numeric = 0
      + min_special = 0
      + min_upper   = 0
      + number      = true
      + numeric     = true
      + result      = (known after apply)
      + special     = false
      + upper       = false
    }

Plan: 12 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + kubectl_command = "gcloud container clusters get-credentials my-gke-cluster-pulumi --region us-central1 --project developer-test-02"

Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes

module.gke.random_string.cluster_service_account_suffix[0]: Creating...
module.gke.random_string.cluster_service_account_suffix[0]: Creation complete after 0s [id=6sof]
module.gke.google_service_account.cluster_service_account[0]: Creating...
module.gke.random_shuffle.available_zones[0]: Creating...
module.gke.random_shuffle.available_zones[0]: Creation complete after 0s [id=-]
module.gke.google_service_account.cluster_service_account[0]: Still creating... [10s elapsed]
module.gke.google_service_account.cluster_service_account[0]: Creation complete after 11s [id=projects/developer-test-02/serviceAccounts/tf-gke-my-gke-cluster--6sof@developer-test-02.iam.gserviceaccount.com]
module.gke.google_project_iam_member.cluster_service_account_resource_metadata_writer[0]: Creating...
module.gke.google_project_iam_member.cluster_service_account_node_service_account[0]: Creating...
module.gke.google_project_iam_member.cluster_service_account_metric_writer[0]: Creating...
module.gke.google_container_cluster.primary: Creating...
module.gke.google_project_iam_member.cluster_service_account_node_service_account[0]: Creation complete after 9s [id=developer-test-02/roles/container.defaultNodeServiceAccount/serviceAccount:tf-gke-my-gke-cluster--6sof@developer-test-02.iam.gserviceaccount.com]
module.gke.google_project_iam_member.cluster_service_account_metric_writer[0]: Creation complete after 10s [id=developer-test-02/roles/monitoring.metricWriter/serviceAccount:tf-gke-my-gke-cluster--6sof@developer-test-02.iam.gserviceaccount.com]
module.gke.google_project_iam_member.cluster_service_account_resource_metadata_writer[0]: Creation complete after 10s [id=developer-test-02/roles/stackdriver.resourceMetadata.writer/serviceAccount:tf-gke-my-gke-cluster--6sof@developer-test-02.iam.gserviceaccount.com]
module.gke.google_container_cluster.primary: Still creating... [10s elapsed]
module.gke.google_container_cluster.primary: Still creating... [20s elapsed]
module.gke.google_container_cluster.primary: Still creating... [30s elapsed]
module.gke.google_container_cluster.primary: Still creating... [40s elapsed]
module.gke.google_container_cluster.primary: Still creating... [50s elapsed]
module.gke.google_container_cluster.primary: Still creating... [1m0s elapsed]
module.gke.google_container_cluster.primary: Still creating... [1m10s elapsed]
module.gke.google_container_cluster.primary: Still creating... [1m20s elapsed]
module.gke.google_container_cluster.primary: Still creating... [1m30s elapsed]
module.gke.google_container_cluster.primary: Still creating... [1m40s elapsed]
module.gke.google_container_cluster.primary: Still creating... [1m50s elapsed]
module.gke.google_container_cluster.primary: Still creating... [2m0s elapsed]
module.gke.google_container_cluster.primary: Still creating... [2m10s elapsed]
module.gke.google_container_cluster.primary: Still creating... [2m20s elapsed]
module.gke.google_container_cluster.primary: Still creating... [2m30s elapsed]
module.gke.google_container_cluster.primary: Still creating... [2m40s elapsed]
module.gke.google_container_cluster.primary: Still creating... [2m50s elapsed]
module.gke.google_container_cluster.primary: Still creating... [3m0s elapsed]
module.gke.google_container_cluster.primary: Still creating... [3m10s elapsed]
module.gke.google_container_cluster.primary: Still creating... [3m20s elapsed]
module.gke.google_container_cluster.primary: Still creating... [3m30s elapsed]
module.gke.google_container_cluster.primary: Still creating... [3m40s elapsed]
module.gke.google_container_cluster.primary: Still creating... [3m50s elapsed]
module.gke.google_container_cluster.primary: Still creating... [4m0s elapsed]
module.gke.google_container_cluster.primary: Still creating... [4m10s elapsed]
module.gke.google_container_cluster.primary: Still creating... [4m20s elapsed]
module.gke.google_container_cluster.primary: Still creating... [4m30s elapsed]
module.gke.google_container_cluster.primary: Still creating... [4m40s elapsed]
module.gke.google_container_cluster.primary: Still creating... [4m50s elapsed]
module.gke.google_container_cluster.primary: Still creating... [5m0s elapsed]
module.gke.google_container_cluster.primary: Still creating... [5m10s elapsed]
module.gke.google_container_cluster.primary: Still creating... [5m20s elapsed]
module.gke.google_container_cluster.primary: Creation complete after 5m25s [id=projects/developer-test-02/locations/us-central1/clusters/my-gke-cluster-pulumi]
module.gke.google_container_node_pool.pools["default-node-pool"]: Creating...
module.gke.google_container_node_pool.pools["default-node-pool"]: Still creating... [10s elapsed]
module.gke.google_container_node_pool.pools["default-node-pool"]: Still creating... [20s elapsed]
module.gke.google_container_node_pool.pools["default-node-pool"]: Still creating... [30s elapsed]
module.gke.google_container_node_pool.pools["default-node-pool"]: Still creating... [40s elapsed]
module.gke.google_container_node_pool.pools["default-node-pool"]: Still creating... [50s elapsed]
module.gke.google_container_node_pool.pools["default-node-pool"]: Still creating... [1m0s elapsed]
module.gke.google_container_node_pool.pools["default-node-pool"]: Still creating... [1m10s elapsed]
module.gke.google_container_node_pool.pools["default-node-pool"]: Still creating... [1m20s elapsed]
module.gke.google_container_node_pool.pools["default-node-pool"]: Still creating... [1m30s elapsed]
module.gke.google_container_node_pool.pools["default-node-pool"]: Creation complete after 1m36s [id=projects/developer-test-02/locations/us-central1/clusters/my-gke-cluster-pulumi/nodePools/default-node-pool]
helm_release.nginx_ingress: Creating...
helm_release.nginx_ingress: Still creating... [10s elapsed]
helm_release.nginx_ingress: Still creating... [20s elapsed]
helm_release.nginx_ingress: Still creating... [30s elapsed]
helm_release.nginx_ingress: Still creating... [40s elapsed]
helm_release.nginx_ingress: Still creating... [50s elapsed]
helm_release.nginx_ingress: Still creating... [1m0s elapsed]
helm_release.nginx_ingress: Still creating... [1m10s elapsed]
helm_release.nginx_ingress: Still creating... [1m20s elapsed]
helm_release.nginx_ingress: Still creating... [1m30s elapsed]
helm_release.nginx_ingress: Still creating... [1m40s elapsed]
helm_release.nginx_ingress: Still creating... [1m50s elapsed]
helm_release.nginx_ingress: Creation complete after 1m53s [id=nginx-ingress]
kubernetes_service.websocket_demo_svc: Creating...
kubernetes_deployment.websocket_demo: Creating...
kubernetes_service.websocket_demo_svc: Creation complete after 1s [id=default/websocket-demo-service]
kubernetes_ingress_v1.websocket_demo_ingress: Creating...
kubernetes_ingress_v1.websocket_demo_ingress: Creation complete after 1s [id=default/websocket-demo-ingress]
kubernetes_deployment.websocket_demo: Still creating... [10s elapsed]
kubernetes_deployment.websocket_demo: Still creating... [20s elapsed]
kubernetes_deployment.websocket_demo: Still creating... [30s elapsed]
kubernetes_deployment.websocket_demo: Still creating... [40s elapsed]
kubernetes_deployment.websocket_demo: Creation complete after 48s [id=default/websocket-demo-deployment]

Apply complete! Resources: 12 added, 0 changed, 0 destroyed.

Outputs:

kubectl_command = "gcloud container clusters get-credentials my-gke-cluster-pulumi --region us-central1 --project developer-test-02"
miguel_lemos@Mac pulumi-k8s-websocket % kubectl_command = "gcloud container clusters get-credentials my-gke-cluster-pulumi --region us-central1 --project developer-test-02"

zsh: command not found: kubectl_command
miguel_lemos@Mac pulumi-k8s-websocket % gcloud container clusters get-credentials my-gke-cluster-pulumi --region us-central1 --project developer-test-02
miguel_lemos@Mac pulumi-k8s-websocket % gcloud container clusters get-credentials my-gke-cluster-pulumi --region us-central1 --project developer-test-02
Fetching cluster endpoint and auth data.
kubeconfig entry generated for my-gke-cluster-pulumi.


Updates are available for some Google Cloud CLI components.  To install them,
please run:
  $ gcloud components update

miguel_lemos@Mac pulumi-k8s-websocket % kubectl get deployments

NAME                        READY   UP-TO-DATE   AVAILABLE   AGE
websocket-demo-deployment   1/1     1            1           3m24s
miguel_lemos@Mac pulumi-k8s-websocket % kubectl describe deployment websocket-demo-deployment
Name:                   websocket-demo-deployment
Namespace:              default
CreationTimestamp:      Tue, 21 Jan 2025 07:03:09 +0100
Labels:                 app=websocket-demo
Annotations:            deployment.kubernetes.io/revision: 1
Selector:               app=websocket-demo
Replicas:               1 desired | 1 updated | 1 total | 1 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=websocket-demo
  Containers:
   websocket-demo:
    Image:         miguelemos/websocket:latest
    Port:          8080/TCP
    Host Port:     0/TCP
    Environment:   <none>
    Mounts:        <none>
  Volumes:         <none>
  Node-Selectors:  <none>
  Tolerations:     <none>
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Available      True    MinimumReplicasAvailable
  Progressing    True    NewReplicaSetAvailable
OldReplicaSets:  <none>
NewReplicaSet:   websocket-demo-deployment-7d85df44f (1/1 replicas created)
Events:
  Type    Reason             Age    From                   Message
  ----    ------             ----   ----                   -------
  Normal  ScalingReplicaSet  3m38s  deployment-controller  Scaled up replica set websocket-demo-deployment-7d85df44f to 1
miguel_lemos@Mac pulumi-k8s-websocket % kubectl get services
NAME                     TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
kubernetes               ClusterIP   34.118.224.1     <none>        443/TCP   8m21s
websocket-demo-service   ClusterIP   34.118.234.100   <none>        80/TCP    3m55s
miguel_lemos@Mac pulumi-k8s-websocket % kubectl port-forward service/websocket-demo-service 8080:80
Forwarding from 127.0.0.1:8080 -> 8080
Forwarding from [::1]:8080 -> 8080
Handling connection for 8080
Handling connection for 8080
Handling connection for 8080
Handling connection for 8080
Handling connection for 8080
Handling connection for 8080
```

<img width="1920" alt="Screenshot 2025-01-21 at 07 09 52" src="https://github.com/user-attachments/assets/6afce338-cadb-47bb-9208-e4c8ca5dc1ff" />

`sh script.remote.teardown.sh`

```
...
```
