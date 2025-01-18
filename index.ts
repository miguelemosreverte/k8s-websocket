import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as docker from "@pulumi/docker";
import * as k8s from "@pulumi/kubernetes";

// GCP project
const projectName = "development_test_02";
const location = "us-central1";

// Switch GKE vs. Minikube
const useGke = pulumi.getStack() === "gke";

// If needed: create GKE cluster
let kubeconfig: pulumi.Output<string> | undefined;
let cluster: gcp.container.Cluster | undefined;
if (useGke) {
  cluster = new gcp.container.Cluster("gke-cluster", {
    initialNodeCount: 1,
    location,
    minMasterVersion: "1.21",
    nodeVersion: "1.21",
    nodeConfig: {
      machineType: "e2-medium",
      oauthScopes: ["https://www.googleapis.com/auth/cloud-platform"],
    },
    project: projectName,
    network: "default",
  });

  // Build kubeconfig
  kubeconfig = pulumi
    .all([cluster.name, cluster.endpoint, cluster.masterAuth])
    .apply(([name, endpoint, auth]) => {
      const context = `${gcp.config.project}_${location}_${name}`;
      return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${auth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: ${context}
  name: ${context}
current-context: ${context}
kind: Config
preferences: {}
users:
- name: ${context}
  user:
    auth-provider:
      config:
        cmd-args: config config-helper --format=json
        cmd-path: gcloud
        expiry-key: '{.credential.token_expiry}'
        token-key: '{.credential.access_token}'
      name: gcp
`;
    });
} else {
  // For Minikube
  kubeconfig = pulumi.output(`
apiVersion: v1
clusters:
- cluster:
    server: https://$(minikube ip):8443
  name: minikube
contexts:
- context:
    cluster: minikube
    user: minikube
  name: minikube
current-context: minikube
kind: Config
preferences: {}
users:
- name: minikube
  user:
    client-certificate: ~/.minikube/client.crt
    client-key: ~/.minikube/client.key
`);
}

// Build & push Docker image to GCR
const imageName = "gcr.io/development_test_02/chat-app:v1";
const dockerToken = gcp.getAccessToken(); // uses service-account JSON from pulumi config

const chatAppImage = new docker.Image("chat-app-image", {
  build: {
    context: ".",
    platform: "linux/amd64",
  },
  imageName,
  registry: pulumi.output(dockerToken).apply((token) => ({
    server: "gcr.io",
    username: "oauth2accesstoken",
    password: pulumi.secret(token.token), // mark secret
  })),
});

// Create a K8s provider
const k8sProvider = new k8s.Provider("k8sProvider", {
  kubeconfig: kubeconfig,
});

// Deploy a K8s Deployment with the newly built image
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

// K8s Service (LoadBalancer)
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
export const clusterName = useGke ? cluster!.name : pulumi.output("minikube");
export const clusterEndpoint = useGke
  ? cluster!.endpoint
  : pulumi.output("https://$(minikube ip):8443");

export const deploymentName = deployment.metadata.name;
export const serviceName = service.metadata.name;
export const serviceIP = service.status.loadBalancer.ingress.apply(
  (ingress) => ingress[0]?.ip ?? "Pending IP",
);
