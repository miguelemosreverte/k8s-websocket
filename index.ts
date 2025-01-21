import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import * as helm from "@pulumi/kubernetes/helm";

// Configuration variables
const config = new pulumi.Config();
const projectId = config.require("projectId");
const region = config.require("region");
const clusterName = config.require("clusterName");
const machineType = config.require("machineType");
const diskSizeGb = config.requireNumber("diskSizeGb");
const minNodeCount = config.requireNumber("minNodeCount");
const maxNodeCount = config.requireNumber("maxNodeCount");

// GCP Provider
const gcpProvider = new gcp.Provider("gcp", {
  credentials: config.requireSecret("credentialsFile"),
  project: projectId,
  region: region,
});

// GKE Cluster
const cluster = new gcp.container.Cluster(
  "primary",
  {
    name: clusterName,
    location: region,
    initialNodeCount: 1,
    removeDefaultNodePool: true,
    nodeConfig: {},
    networkingMode: "VPC_NATIVE",
  },
  { provider: gcpProvider },
);

// Node Pool
const nodePool = new gcp.container.NodePool(
  "primary-nodes",
  {
    name: "default-node-pool",
    cluster: cluster.name,
    location: region,
    nodeConfig: {
      machineType: machineType,
      diskSizeGb: diskSizeGb,
      oauthScopes: ["https://www.googleapis.com/auth/cloud-platform"],
    },
    autoscaling: {
      minNodeCount: minNodeCount,
      maxNodeCount: maxNodeCount,
    },
  },
  { provider: gcpProvider },
);

// Get the kubeconfig for the cluster
const kubeconfig = pulumi.secret(
  cluster.name.apply(async (name) => {
    const cluster = await gcp.container.getCluster({ name, location: region });
    const context = `${gcpProvider.project}_${region}_${name}`;
    return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${cluster.masterAuths[0].clusterCaCertificate}
    server: https://${cluster.endpoint}
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
  }),
);

// Kubernetes Provider
const k8sProvider = new k8s.Provider("k8s", {
  kubeconfig: kubeconfig,
});

// Helm Chart for NGINX Ingress
const nginxIngress = new helm.v3.Chart(
  "nginx-ingress",
  {
    chart: "ingress-nginx",
    version: "4.7.1",
    fetchOpts: {
      repo: "https://kubernetes.github.io/ingress-nginx",
    },
    namespace: "ingress-nginx",
  },
  { provider: k8sProvider },
);

// WebSocket Demo Deployment
const appLabels = { app: "websocket-demo" };
const deployment = new k8s.apps.v1.Deployment(
  "websocket-demo",
  {
    metadata: { labels: appLabels },
    spec: {
      replicas: 1,
      selector: { matchLabels: appLabels },
      template: {
        metadata: { labels: appLabels },
        spec: {
          containers: [
            {
              name: "websocket-demo",
              image: "nginx:1.27.3",
              ports: [{ containerPort: 80 }],
            },
          ],
        },
      },
    },
  },
  { provider: k8sProvider },
);

// Kubernetes Service
const service = new k8s.core.v1.Service(
  "websocket-demo-service",
  {
    metadata: { labels: appLabels },
    spec: {
      selector: appLabels,
      ports: [{ port: 80, targetPort: 80 }],
      type: "ClusterIP",
    },
  },
  { provider: k8sProvider },
);

// Kubernetes Ingress
const ingress = new k8s.networking.v1.Ingress(
  "websocket-demo-ingress",
  {
    metadata: {
      annotations: { "kubernetes.io/ingress.class": "nginx" },
    },
    spec: {
      rules: [
        {
          http: {
            paths: [
              {
                path: "/",
                pathType: "Prefix",
                backend: {
                  service: {
                    name: service.metadata.name,
                    port: { number: 80 },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
  { provider: k8sProvider },
);

// Export the kubeconfig
export const kubeconfigOutput = kubeconfig;
