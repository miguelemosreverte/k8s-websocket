import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";
import * as k8s from "@pulumi/kubernetes";
import * as tf from "@pulumi/tf";

// Config
const config = new pulumi.Config();
const environment = config.get("environment") || "minikube";
const isMinikube = environment === "minikube";
const projectId = "development-test-02";

// Create GKE cluster using official Terraform module if not using minikube
let k8sProvider: k8s.Provider | undefined;

if (!isMinikube) {
  const gkeCluster = new tf.Resource("gke-cluster", {
    type: "google",
    source: "terraform-google-modules/kubernetes-engine/google",
    version: "28.0.0",
    properties: {
      project_id: projectId,
      name: "gke-cluster",
      region: "us-central1",
      network: "default",
      subnetwork: "default",

      node_pools: [
        {
          name: "default-node-pool",
          machine_type: "e2-standard-2",
          min_count: 1,
          max_count: 3,
          disk_size_gb: 100,
          disk_type: "pd-standard",
          image_type: "COS_CONTAINERD",
          auto_repair: true,
          auto_upgrade: true,
        },
      ],
    },
  });

  // Create k8s provider from GKE cluster
  k8sProvider = new k8s.Provider(
    "gke-k8s",
    {
      kubeconfig: gkeCluster.properties.kubeconfig,
    },
    { dependsOn: [gkeCluster] },
  );
}

// Registry setup for GCloud
const registryServer = !isMinikube ? `gcr.io/${projectId}` : undefined;
const registryUsername = !isMinikube ? "_json_key" : undefined;
const registryPassword = !isMinikube
  ? config.getSecret("registryPassword")
  : undefined;

// Image name setup
const imageName = isMinikube ? "chat-app:v1" : `${registryServer}/chat-app:v1`;

// Docker build
const chatAppImage = new docker.Image("chat-app-image", {
  build: {
    context: ".",
    platform: "linux/amd64",
  },
  imageName: imageName,
  skipPush: isMinikube,
  registry:
    !isMinikube && registryServer
      ? {
          server: registryServer,
          username: registryUsername,
          password: registryPassword,
        }
      : undefined,
});

// Application deployment
const appLabels = { app: "chat-app" };
const deployment = new k8s.apps.v1.Deployment(
  "chat-app-deployment",
  {
    metadata: { name: "chat-app" },
    spec: {
      replicas: 1,
      selector: { matchLabels: appLabels },
      template: {
        metadata: { labels: appLabels },
        spec: {
          containers: [
            {
              name: "chat-app",
              image: chatAppImage.imageName,
              ports: [{ containerPort: 8080 }],
            },
          ],
        },
      },
    },
  },
  { provider: k8sProvider },
);

// Service
const service = new k8s.core.v1.Service(
  "chat-app-service",
  {
    metadata: { name: "chat-app" },
    spec: {
      type: isMinikube ? "NodePort" : "LoadBalancer",
      selector: appLabels,
      ports: [{ port: 8080, targetPort: 8080 }],
    },
  },
  { provider: k8sProvider },
);

// Exports
export const deploymentName = deployment.metadata.name;
export const serviceName = service.metadata.name;
export const nodePort = isMinikube ? service.spec.ports[0].nodePort : undefined;
