import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as docker from "@pulumi/docker";
import * as k8s from "@pulumi/kubernetes";

// ---------------------------------------------------------------------
// 1) PROJECT SETTINGS
// ---------------------------------------------------------------------

// Replace this with your real GCP project name:
const projectName = "development_test_02";
// Choose your preferred GCP region or zone:
const location = "us-central1";

// If the stack name is "gke", we deploy on GKE. Otherwise, Minikube.
const useGke = pulumi.getStack() === "gke";

// ---------------------------------------------------------------------
// 2) CREATE (OR SKIP) A GKE CLUSTER
// ---------------------------------------------------------------------

let kubeconfig: pulumi.Output<string>;
let cluster: gcp.container.Cluster | undefined;

if (useGke) {
  // Create a GKE cluster
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

  // Build a kubeconfig from the cluster info
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
  // Use a generic Minikube kubeconfig (update IP if needed)
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

// ---------------------------------------------------------------------
// 3) BUILD & PUSH DOCKER IMAGE TO GCR
// ---------------------------------------------------------------------

// Grab a short-lived token from your existing GCP credentials
const dockerToken = gcp.getAccessToken();

// Name and tag for your container image
const imageName = "gcr.io/development_test_02/chat-app:v1";

// Build/push the Docker image to GCR
const chatAppImage = new docker.Image("chat-app-image", {
  build: {
    context: ".",
    platform: "linux/amd64", // helpful on Apple Silicon
  },
  imageName,
  registry: dockerToken.apply(
    (token: gcp.types.output.GetAccessTokenResult) => ({
      server: "gcr.io",
      username: "oauth2accesstoken",
      password: pulumi.secret(token.token), // store the token as a secret
    }),
  ),
});

// ---------------------------------------------------------------------
// 4) CREATE A KUBERNETES PROVIDER
// ---------------------------------------------------------------------
const k8sProvider = new k8s.Provider("k8sProvider", {
  kubeconfig,
});

// ---------------------------------------------------------------------
// 5) DEPLOYMENT + SERVICE
// ---------------------------------------------------------------------

// We’ll label our pods "app: chat-app"
const appLabels = { app: "chat-app" };

// K8s Deployment referencing the image we just built/pushed
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

// K8s Service of type LoadBalancer (on GKE) or NodePort/LoadBalancer on Minikube
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

// ---------------------------------------------------------------------
// 6) EXPORT OUTPUTS
// ---------------------------------------------------------------------

// If GKE, export cluster name/endpoint; otherwise "minikube"
export const clusterName = useGke ? cluster!.name : pulumi.output("minikube");
export const clusterEndpoint = useGke
  ? cluster!.endpoint
  : pulumi.output("https://$(minikube ip):8443");

// Export the Docker image name so we can see where it was pushed
export const deployedImage = chatAppImage.imageName;

// Export the K8s service info
export const serviceName = service.metadata.name;
export const serviceIP = service.status.loadBalancer.ingress.apply(
  (ing) => ing[0]?.ip ?? "Pending IP",
);
