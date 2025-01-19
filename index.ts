import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";

const name = "helloworld";

// Set the region or zone
const region = "us-central1"; // Change to your desired region
const zone = "us-central1-a"; // Change to your desired zone

// Get the latest GKE engine version
const engineVersion = gcp.container
  .getEngineVersions({ location: zone })
  .then((v) => v.latestMasterVersion);

// Create a GKE cluster
const cluster = new gcp.container.Cluster(name, {
  initialNodeCount: 2,
  minMasterVersion: engineVersion,
  nodeVersion: engineVersion,
  location: zone,
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

// Export the Cluster name
export const clusterName = cluster.name;

// Manufacture a GKE-style kubeconfig
export const kubeconfig = pulumi
  .all([cluster.name, cluster.endpoint, cluster.masterAuth])
  .apply(([name, endpoint, masterAuth]) => {
    const context = `${gcp.config.project}_${zone}_${name}`;
    return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${masterAuth.clusterCaCertificate}
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
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: gke-gcloud-auth-plugin
      installHint: Install gke-gcloud-auth-plugin for use with kubectl by following
        https://cloud.google.com/blog/products/containers-kubernetes/kubectl-auth-changes-in-gke
      provideClusterInfo: true
`;
  });

// Create a Kubernetes provider instance that uses our cluster from above
const clusterProvider = new k8s.Provider(name, {
  kubeconfig: kubeconfig,
});

// Create a Kubernetes Namespace
const ns = new k8s.core.v1.Namespace(name, {}, { provider: clusterProvider });

// Export the Namespace name
export const namespaceName = ns.metadata.apply((m) => m.name);

// Create a NGINX Deployment
const appLabels = { appClass: name };
const deployment = new k8s.apps.v1.Deployment(
  name,
  {
    metadata: {
      namespace: namespaceName,
      labels: appLabels,
    },
    spec: {
      replicas: 1,
      selector: { matchLabels: appLabels },
      template: {
        metadata: {
          labels: appLabels,
        },
        spec: {
          containers: [
            {
              name: name,
              image: "nginx:latest",
              ports: [{ name: "http", containerPort: 80 }],
            },
          ],
        },
      },
    },
  },
  {
    provider: clusterProvider,
  },
);

// Export the Deployment name
export const deploymentName = deployment.metadata.apply((m) => m.name);

// Create a LoadBalancer Service for the NGINX Deployment
const service = new k8s.core.v1.Service(
  name,
  {
    metadata: {
      labels: appLabels,
      namespace: namespaceName,
    },
    spec: {
      type: "LoadBalancer",
      ports: [{ port: 80, targetPort: "http" }],
      selector: appLabels,
    },
  },
  {
    provider: clusterProvider,
  },
);

// Export the Service name and public LoadBalancer endpoint
export const serviceName = service.metadata.apply((m) => m.name);
export const servicePublicIP = service.status.apply(
  (s) => s.loadBalancer.ingress[0].ip,
);
