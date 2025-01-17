#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Deleting Kubernetes resources..."
kubectl delete service chat-app
kubectl delete deployment chat-app

echo "Removing Docker image from Minikube..."
# Stop and remove any containers using the image
minikube ssh "docker ps -a --filter ancestor=chat-app:v1 -q | xargs -r docker stop"
minikube ssh "docker ps -a --filter ancestor=chat-app:v1 -q | xargs -r docker rm"

# Forcefully remove the image
minikube ssh "docker rmi -f chat-app:v1"

echo "Teardown complete."
