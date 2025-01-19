import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";
import * as k8s from "@pulumi/kubernetes";
import * as gcp from "@pulumi/gcp";

// Config
const config = new pulumi.Config();
const environment = config.get("environment") || "minikube";
const isMinikube = environment === "minikube";
const projectId = "development-test-02";

let k8sProvider: k8s.Provider;

if (!isMinikube) {
  // Create the GKE cluster
  const cluster = new gcp.container.Cluster("gke-cluster", {
    name: "gke-cluster",
    location: "us-central1",
    initialNodeCount: 2,
    minMasterVersion: "1.27",
    project: projectId,
    // Configuration for nodes
    nodeConfig: {
      machineType: "n1-standard-1",
      oauthScopes: [
        "https://www.googleapis.com/auth/compute",
        "https://www.googleapis.com/auth/devstorage.read_only",
        "https://www.googleapis.com/auth/logging.write",
        "https://www.googleapis.com/auth/monitoring",
      ],
    },
  });

  // Get credentials for the cluster
  const clusterKubeconfig = pulumi
    .all([cluster.name, cluster.endpoint, cluster.masterAuth])
    .apply(([name, endpoint, masterAuth]) => {
      const context = `${projectId}_${cluster.location}_${name}`;
      return `apiVersion: v1
kind: Config
clusters:
- name: ${context}
  cluster:
    server: https://${endpoint}
    certificate-authority-data: ${masterAuth.clusterCaCertificate}
contexts:
- name: ${context}
  context:
    cluster: ${context}
    user: ${context}
current-context: ${context}
users:
- name: ${context}
  user:
    auth-provider:
      config:
        cmd-args: config config-helper --format=json
        cmd-path: gcloud
        expiry-key: '{.credential.token_expiry}'
        token-key: '{.credential.access_token}'
      name: gcp`;
    });

  // Create the k8s provider with the kubeconfig
  k8sProvider = new k8s.Provider("gke-k8s", {
    kubeconfig: clusterKubeconfig,
  });
} else {
  // For minikube, use the default provider
  k8sProvider = new k8s.Provider("k8s", {});
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
