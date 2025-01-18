import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";

// Create a GKE cluster
const cluster = new gcp.container.Cluster("my-cluster", {
  initialNodeCount: 3,
  minMasterVersion: "latest",
  nodeConfig: {
    machineType: "n1-standard-1",
    oauthScopes: ["https://www.googleapis.com/auth/cloud-platform"],
  },
});

// Export the cluster's endpoint
export const clusterEndpoint = cluster.endpoint;

// Create a Kubernetes provider instance using the cluster's kubeconfig
const provider = new k8s.Provider("gkeK8s", {
  kubeconfig: pulumi
    .all([cluster.name, cluster.endpoint, cluster.masterAuth])
    .apply(([name, endpoint, auth]) => {
      return `apiVersion: v1
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
kind: Config
preferences: {}
users:
- name: ${name}
  user:
    username: ${auth.username}
    password: ${auth.password}
`;
    }),
});

// Create a Kubernetes namespace
const ns = new k8s.core.v1.Namespace("hello-world-ns", {}, { provider });

// Deploy a simple "Hello World" application
const appLabels = { app: "hello-world" };
const deployment = new k8s.apps.v1.Deployment(
  "hello-world-deployment",
  {
    metadata: {
      namespace: ns.metadata.name,
    },
    spec: {
      selector: { matchLabels: appLabels },
      replicas: 2,
      template: {
        metadata: { labels: appLabels },
        spec: {
          containers: [
            {
              name: "hello-world",
              image: "gcr.io/google-samples/node-hello:1.0",
              ports: [{ containerPort: 8080 }],
            },
          ],
        },
      },
    },
  },
  { provider },
);

const service = new k8s.core.v1.Service(
  "hello-world-service",
  {
    metadata: {
      namespace: ns.metadata.name,
    },
    spec: {
      type: "LoadBalancer",
      selector: appLabels,
      ports: [{ port: 80, targetPort: 8080 }],
    },
  },
  { provider },
);

// Export the service's external IP
export const serviceIP = service.status.loadBalancer.ingress[0].ip;
