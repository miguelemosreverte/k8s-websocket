minikube start --driver=docker
pulumi stack init dev-minikube
pulumi stack select dev-minikube
eval "$(minikube docker-env)"
pulumi up
minikube service chat-app --url
