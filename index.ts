import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";
import * as k8s from "@pulumi/kubernetes";
import * as gcp from "@pulumi/gcp";

// Config
const config = new pulumi.Config();
const environment = config.get("environment") || "minikube";
const isMinikube = environment === "minikube";
const projectId = "development-test-02";

let k8sProvider: k8s.Provider | undefined;

if (!isMinikube) {
  // First create the GKE cluster
  const cluster = new gcp.container.Cluster("gke-cluster", {
    location: "us-central1",
    initialNodeCount: 2,
    project: projectId,
    // Remove the default node pool after cluster creation
    removeDefaultNodePool: true,
    // Enable Workload Identity
    workloadIdentityConfig: {
      workloadPool: `${projectId}.svc.id.goog`,
    },
  });

  // Create a separately managed node pool
  const nodePool = new gcp.container.NodePool("primary-nodes", {
    cluster: cluster.name,
    location: "us-central1",
    project: projectId,
    nodeCount: 2,
    nodeConfig: {
      preemptible: false,
      machineType: "n1-standard-1",
      oauthScopes: ["https://www.googleapis.com/auth/cloud-platform"],
      // Enable Workload Identity on the node pool
      workloadMetadataConfig: {
        mode: "GKE_METADATA",
      },
    },
  });

  const kubeconfig = pulumi
    .all([cluster.name, cluster.endpoint, cluster.masterAuth, cluster.location])
    .apply(([name, endpoint, auth, location]) => {
      return `apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: ${auth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${name}
contexts:
- context:
    cluster: ${name}
    user: ${name}
  name: ${name}
current-context: ${name}
users:
- name: ${name}
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: gke-gcloud-auth-plugin
      installHint: Install gke-gcloud-auth-plugin for use with kubectl by following https://cloud.google.com/blog/products/containers-kubernetes/kubectl-auth-changes-in-gke
      provideClusterInfo: true`;
    });

  // Create the k8s provider with the kubeconfig
  k8sProvider = new k8s.Provider(
    "gke-k8s",
    {
      kubeconfig: kubeconfig,
    },
    { dependsOn: [nodePool] },
  ); // Important: Wait for the node pool
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

// Only proceed with k8s resources if we have a provider
if (k8sProvider) {
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
        type: "LoadBalancer",
        selector: appLabels,
        ports: [{ port: 8080, targetPort: 8080 }],
      },
    },
    { provider: k8sProvider },
  );

  // Exports
  export const deploymentName = deployment.metadata.name;
  export const serviceName = service.metadata.name;
}
