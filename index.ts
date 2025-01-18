import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as docker from "@pulumi/docker";
import * as k8s from "@pulumi/kubernetes";

// GCP project
const projectName = "development_test_02";
const location = "us-central1";

// Environment variable to switch between GKE and Minikube
const useGke = pulumi.getStack() === "gke";

// Create a GKE cluster if useGke is true
let kubeconfig: pulumi.Output<string>;
let cluster: gcp.container.Cluster | undefined;

if (useGke) {
  cluster = new gcp.container.Cluster("gke-cluster", {
    initialNodeCount: 1,
    location: location,
    minMasterVersion: "1.21",
    nodeVersion: "1.21",
    nodeConfig: {
      machineType: "e2-medium",
      oauthScopes: ["https://www.googleapis.com/auth/cloud-platform"],
    },
    network: "default",
    project: projectName,
  });

  // Get the cluster credentials
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
  // Kubeconfig for Minikube
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

// Build and push Docker image
const imageName = "gcr.io/development_test_02/chat-app:v1";

// -- FIX: Ensure we have a defined string for the token --
const token = gcp.config.accessToken;
if (!token) {
  throw new Error(
    "No GCP access token found. Please set 'gcp:accessToken' in Pulumi config, or authenticate via Service Account.",
  );
}

// Pass the token to Docker registry with pulumi.secret
const chatAppImage = new docker.Image("chat-app-image", {
  build: {
    context: ".",
    platform: "linux/amd64", // Often needed on Apple Silicon
  },
  imageName: imageName,
  registry: {
    server: "gcr.io",
    username: "oauth2accesstoken",
    password: pulumi.secret(token),
  },
});

// Create a Kubernetes provider using the kubeconfig
const k8sProvider = new k8s.Provider("k8sProvider", {
  kubeconfig: kubeconfig,
});

// Define K8s Deployment with the Pulumi-built image
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

// Define K8s Service
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

// Export the cluster info
export const clusterName = useGke ? cluster!.name : pulumi.output("minikube");
export const clusterEndpoint = useGke
  ? cluster!.endpoint
  : pulumi.output("https://$(minikube ip):8443");

// Export deployment/service metadata
export const deploymentName = deployment.metadata.name;
export const serviceName = service.metadata.name;

// Safely export the LoadBalancer IP
export const serviceIP = service.status.loadBalancer.ingress.apply(
  (ingressArray) => ingressArray[0]?.ip ?? "Pending IP",
);
