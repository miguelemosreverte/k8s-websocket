import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";
import * as k8s from "@pulumi/kubernetes";

// 1. Read Pulumi config to decide environment (e.g. "minikube" or "gcloud").
const config = new pulumi.Config();
const environment = config.get("environment") || "minikube";
const isMinikube = environment === "minikube";

// 2. Registry info (for GCloud). If environment === "gcloud", set these via `pulumi config`.
const registryServer = config.get("registryServer"); // e.g. "gcr.io/your-project"
const registryUsername = config.get("registryUsername") || "_json_key";
const registryPassword = config.getSecret("registryPassword");

// 3. Choose an image name: local tag for minikube, fully qualified for gcloud.
const imageName = isMinikube ? "chat-app:v1" : `${registryServer}/chat-app:v1`;

// 4. Docker build (and conditionally push).
//    - Force "linux/amd64" if you're on an M1/M2 Mac and the base image lacks ARM support.
//    - skipPush: true avoids needing a canonical name for local minikube builds.
const chatAppImage = new docker.Image("chat-app-image", {
  build: {
    context: ".",
    platform: "linux/amd64", // On Apple Silicon, this often fixes 403 or base-image issues
  },
  imageName: imageName,
  skipPush: isMinikube, // Only push if environment == gcloud
  registry:
    !isMinikube && registryServer
      ? {
          server: registryServer,
          username: registryUsername,
          password: registryPassword,
        }
      : undefined,
});

// 5. Define K8s Deployment with the Pulumi-built image.
const appLabels = { app: "chat-app" };
const deployment = new k8s.apps.v1.Deployment("chat-app-deployment", {
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
            image: chatAppImage.imageName, // uses our Docker build
            ports: [{ containerPort: 8080 }],
          },
        ],
      },
    },
  },
});

// 6. Define K8s Service. Use NodePort for minikube, LoadBalancer for gcloud.
const service = new k8s.core.v1.Service("chat-app-service", {
  metadata: { name: "chat-app" },
  spec: {
    type: isMinikube ? "NodePort" : "LoadBalancer",
    selector: appLabels,
    ports: [{ port: 8080, targetPort: 8080 }],
  },
});

// 7. Export some outputs (optional).
export const deploymentName = deployment.metadata.name;
export const serviceName = service.metadata.name;
// For minikube, we also export the NodePort so we can see it easily:
export const nodePort = isMinikube ? service.spec.ports[0].nodePort : undefined;
