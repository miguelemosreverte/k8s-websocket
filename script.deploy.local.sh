#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Building Docker image..."
docker build -t chat-app:v1 .

echo "Loading image into Minikube..."
minikube image load chat-app:v1

echo "Applying Kubernetes manifests..."
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/chat-app

echo "Getting service URL..."
minikube service chat-app --url

echo "Deployment complete. Use 'kubectl get pods' to check the status of your pods."
