# pulumi-k8s-websocket
Pulumi | Kubernetes | Websocket

### HOW TO RUN LOCAL
`minikube start --driver=docker`

`sh script.deploy.local.sh`

```
sh script.deploy.local.sh
😄  minikube v1.35.0 on Darwin 15.1.1 (arm64)
    ▪ MINIKUBE_ACTIVE_DOCKERD=minikube
✨  Using the docker driver based on user configuration
📌  Using Docker Desktop driver with root privileges
👍  Starting "minikube" primary control-plane node in "minikube" cluster
🚜  Pulling base image v0.0.46 ...
🔥  Creating docker container (CPUs=2, Memory=4000MB) ...
🐳  Preparing Kubernetes v1.32.0 on Docker 27.4.1 ...
    ▪ Generating certificates and keys ...
    ▪ Booting up control plane ...
    ▪ Configuring RBAC rules ...
🔗  Configuring bridge CNI (Container Networking Interface) ...
🔎  Verifying Kubernetes components...
    ▪ Using image gcr.io/k8s-minikube/storage-provisioner:v5
🌟  Enabled addons: storage-provisioner, default-storageclass
🏄  Done! kubectl is now configured to use "minikube" cluster and "default" namespace by default
Enter your passphrase to unlock config/secrets
    (set PULUMI_CONFIG_PASSPHRASE or PULUMI_CONFIG_PASSPHRASE_FILE to remember):
Enter your passphrase to unlock config/secrets
error: stack 'organization/pulumi-k8s-websocket/dev-minikube' already exists
Enter your passphrase to unlock config/secrets
    (set PULUMI_CONFIG_PASSPHRASE or PULUMI_CONFIG_PASSPHRASE_FILE to remember):
Enter your passphrase to unlock config/secrets
Previewing update (dev-minikube):
     Type                              Name                               Plan
 +   pulumi:pulumi:Stack               pulumi-k8s-websocket-dev-minikube  create
 +   ├─ docker:index:Image             chat-app-image                     create
 +   ├─ kubernetes:core/v1:Service     chat-app-service                   create
 +   └─ kubernetes:apps/v1:Deployment  chat-app-deployment                create

Outputs:
    deploymentName: "chat-app"
    nodePort      : 32769
    serviceName   : "chat-app"

Resources:
    + 4 to create

Do you want to perform this update? yes
Updating (dev-minikube):
     Type                              Name                               Status
 +   pulumi:pulumi:Stack               pulumi-k8s-websocket-dev-minikube  created (59s)
 +   ├─ kubernetes:core/v1:Service     chat-app-service                   created (10s)
 +   ├─ docker:index:Image             chat-app-image                     created (57s)
 +   └─ kubernetes:apps/v1:Deployment  chat-app-deployment                created (1s)

Outputs:
    deploymentName: "chat-app"
    nodePort      : 31246
    serviceName   : "chat-app"

Resources:
    + 4 created

Duration: 1m1s

http://127.0.0.1:57855
❗  Because you are using a Docker driver on darwin, the terminal needs to be open to run it.
```
<img width="2012" alt="Screenshot 2025-01-18 at 00 21 33" src="https://github.com/user-attachments/assets/aac9b152-f4e5-4edc-84e0-1395e2c23938" />


`sh script.teardown.local.sh`

```
sh script.teardown.local.sh
Taking down Pulumi deployment
Enter your passphrase to unlock config/secrets
    (set PULUMI_CONFIG_PASSPHRASE or PULUMI_CONFIG_PASSPHRASE_FILE to remember):
Enter your passphrase to unlock config/secrets
Previewing destroy (dev-minikube):
     Type                              Name                               Plan
 -   pulumi:pulumi:Stack               pulumi-k8s-websocket-dev-minikube  delete
 -   ├─ kubernetes:core/v1:Service     chat-app-service                   delete
 -   ├─ kubernetes:apps/v1:Deployment  chat-app-deployment                delete
 -   └─ docker:index:Image             chat-app-image                     delete

Outputs:
  - deploymentName: "chat-app"
  - nodePort      : 30482
  - serviceName   : "chat-app"

Resources:
    - 4 to delete

Do you want to perform this destroy? yes
Destroying (dev-minikube):
     Type                              Name                               Status
 -   pulumi:pulumi:Stack               pulumi-k8s-websocket-dev-minikube  deleted (0.00s)
 -   ├─ kubernetes:apps/v1:Deployment  chat-app-deployment                deleted (31s)
 -   ├─ docker:index:Image             chat-app-image                     deleted (0.00s)
 -   └─ kubernetes:core/v1:Service     chat-app-service                   deleted (0.02s)

Outputs:
  - deploymentName: "chat-app"
  - nodePort      : 30482
  - serviceName   : "chat-app"

Resources:
    - 4 deleted

Duration: 32s

The resources in the stack have been deleted, but the history and configuration associated with the stack are still maintained.
If you want to remove the stack completely, run `pulumi stack rm dev-minikube`.
Taking down Minikube
🔥  Deleting "minikube" in docker ...
🔥  Deleting container "minikube" ...
🔥  Removing /Users/miguel_lemos/.minikube/machines/minikube ...
💀  Removed all traces of the "minikube" cluster.
Teardown complete.
```
