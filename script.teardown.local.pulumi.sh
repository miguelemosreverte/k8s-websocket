#!/bin/bash

set -e

echo "Taking down Pulumi deployment"

# Make sure we reconnect to Minikube's Docker daemon environment
eval "$(minikube docker-env)"

pulumi down

echo "Taking down Minikube"
minikube delete

echo "Teardown complete."
